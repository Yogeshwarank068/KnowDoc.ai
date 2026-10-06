const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const xlsx = require('xlsx');
const AdmZip = require('adm-zip');
const OKFConverter = require('./okfConverter');

class DocumentProcessor {
  /**
   * Main router for processing uploaded files into Open Knowledge Format (OKF)
   */
  static async processFile(filePath, originalName, mimeType) {
    const ext = path.extname(originalName).toLowerCase();
    const stats = fs.statSync(filePath);
    const size = stats.size;

    let contentBlocks = [];
    let metadata = {
      title: path.basename(originalName, ext),
      sourceFile: originalName
    };
    let docType = ext.replace('.', '');

    try {
      switch (ext) {
        case '.pdf':
          docType = 'pdf';
          ({ contentBlocks, metadata } = await this.parsePDF(filePath, metadata));
          break;

        case '.docx':
        case '.doc':
          docType = ext === '.docx' ? 'docx' : 'doc';
          ({ contentBlocks, metadata } = await this.parseWord(filePath, ext, metadata));
          break;

        case '.xlsx':
        case '.xls':
        case '.csv':
          docType = ext.replace('.', '');
          ({ contentBlocks, metadata } = await this.parseSpreadsheet(filePath, ext, metadata));
          break;

        case '.pptx':
        case '.ppt':
          docType = ext.replace('.', '');
          ({ contentBlocks, metadata } = await this.parsePowerPoint(filePath, ext, metadata));
          break;

        case '.json':
          docType = 'json';
          ({ contentBlocks, metadata } = await this.parseJSON(filePath, metadata));
          break;

        case '.md':
        case '.markdown':
          docType = 'markdown';
          ({ contentBlocks, metadata } = await this.parseMarkdown(filePath, metadata));
          break;

        case '.txt':
        default:
          docType = 'txt';
          ({ contentBlocks, metadata } = await this.parseText(filePath, metadata));
          break;
      }

      return OKFConverter.createDocument({
        name: originalName,
        type: docType,
        size: size,
        metadata: metadata,
        content: contentBlocks
      });
    } catch (err) {
      console.error(`Error processing file ${originalName}:`, err);
      throw new Error(`Failed to parse ${originalName}: ${err.message}`);
    }
  }

  /**
   * Parse PDF documents
   */
  static async parsePDF(filePath, meta) {
    const dataBuffer = fs.readFileSync(filePath);
    let pagesData = [];
    let totalPages = 1;

    try {
      if (pdfParse && typeof pdfParse.PDFParse === 'function') {
        const parser = new pdfParse.PDFParse({ data: dataBuffer });
        const textResult = await parser.getText();
        if (textResult && Array.isArray(textResult.pages)) {
          pagesData = textResult.pages.map(p => ({ text: p.text || '', pageNum: p.num || 1 }));
          totalPages = textResult.total || pagesData.length;
        } else if (textResult && textResult.text) {
          pagesData = [{ text: textResult.text, pageNum: 1 }];
        }
      } else if (typeof pdfParse === 'function') {
        const data = await pdfParse(dataBuffer);
        totalPages = data.numpages || 1;
        if (data.info) {
          if (data.info.Title) meta.title = data.info.Title;
          if (data.info.Author) meta.author = data.info.Author;
        }
        const rawPages = (data.text || '').split('\f');
        pagesData = rawPages.map((pt, idx) => ({ text: pt, pageNum: idx + 1 }));
      }
    } catch (parseErr) {
      console.warn('PDFParse error, attempting fallback text extraction:', parseErr.message);
      pagesData = [{ text: dataBuffer.toString('utf8').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, ''), pageNum: 1 }];
    }

    meta.pageCount = totalPages || Math.max(1, pagesData.length);

    const contentBlocks = [];

    pagesData.forEach(({ text: pageText, pageNum }) => {
      const lines = pageText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      
      let currentParagraph = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Detect potential headings (short, no period, uppercase or title case)
        const isHeading = line.length < 70 && !line.endsWith('.') && (
          line === line.toUpperCase() ||
          /^(Chapter|Section|\d+\.|\d+\s)/i.test(line) ||
          (line.length < 45 && lines[i + 1] && lines[i + 1].length > line.length)
        );

        if (isHeading) {
          if (currentParagraph.length > 0) {
            contentBlocks.push({
              type: 'paragraph',
              text: currentParagraph.join(' '),
              page: pageNum
            });
            currentParagraph = [];
          }
          contentBlocks.push({
            type: 'heading',
            level: 2,
            text: line,
            page: pageNum
          });
        } else {
          currentParagraph.push(line);
          if (line.endsWith('.') || line.endsWith('?') || line.endsWith('!') || currentParagraph.length > 5) {
            contentBlocks.push({
              type: 'paragraph',
              text: currentParagraph.join(' '),
              page: pageNum
            });
            currentParagraph = [];
          }
        }
      }

      if (currentParagraph.length > 0) {
        contentBlocks.push({
          type: 'paragraph',
          text: currentParagraph.join(' '),
          page: pageNum
        });
      }
    });

    if (contentBlocks.length === 0 && data.text.trim()) {
      contentBlocks.push({
        type: 'paragraph',
        text: data.text.trim(),
        page: 1
      });
    }

    return { contentBlocks, metadata: meta };
  }

  /**
   * Parse Word (.docx / .doc) documents
   */
  static async parseWord(filePath, ext, meta) {
    const contentBlocks = [];

    if (ext === '.docx') {
      const result = await mammoth.extractRawText({ path: filePath });
      const rawText = result.value || '';
      
      // Also try to extract with HTML for heading structure
      try {
        const htmlResult = await mammoth.convertToHtml({ path: filePath });
        const html = htmlResult.value || '';
        
        // Simple regex parser for paragraphs and headings from Mammoth HTML
        const tagRegex = /<(h[1-6]|p|li)>([\s\S]*?)<\/\1>/gi;
        let match;
        let pCount = 0;

        while ((match = tagRegex.exec(html)) !== null) {
          const tag = match[1].toLowerCase();
          const cleanText = match[2].replace(/<[^>]+>/g, '').trim();
          if (!cleanText) continue;

          pCount++;
          const approxPage = Math.floor(pCount / 6) + 1; // Approx 6 paragraphs/page

          if (tag.startsWith('h')) {
            contentBlocks.push({
              type: 'heading',
              level: parseInt(tag[1], 10),
              text: cleanText,
              page: approxPage
            });
          } else {
            contentBlocks.push({
              type: 'paragraph',
              text: cleanText,
              page: approxPage
            });
          }
        }
      } catch (e) {
        console.warn('HTML extraction warning in mammoth, using raw text', e);
      }

      // Fallback if HTML parser yielded nothing
      if (contentBlocks.length === 0) {
        const paragraphs = rawText.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
        paragraphs.forEach((p, idx) => {
          contentBlocks.push({
            type: idx === 0 && p.length < 60 ? 'heading' : 'paragraph',
            level: idx === 0 ? 1 : undefined,
            text: p,
            page: Math.floor(idx / 5) + 1
          });
        });
      }

      meta.pageCount = Math.max(1, Math.ceil(contentBlocks.length / 5));
    } else {
      // Legacy .doc or plain fallback
      const text = fs.readFileSync(filePath, 'utf8').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '');
      const paragraphs = text.split(/\r?\n/).map(p => p.trim()).filter(p => p.length > 5);
      paragraphs.forEach((p, idx) => {
        contentBlocks.push({
          type: 'paragraph',
          text: p,
          page: Math.floor(idx / 5) + 1
        });
      });
      meta.pageCount = Math.max(1, Math.ceil(contentBlocks.length / 5));
    }

    return { contentBlocks, metadata: meta };
  }

  /**
   * Parse Spreadsheet files (XLSX, XLS, CSV)
   */
  static async parseSpreadsheet(filePath, ext, meta) {
    const workbook = xlsx.readFile(filePath, { cellDates: true });
    const sheetNames = workbook.SheetNames || [];
    meta.sheetCount = sheetNames.length;
    meta.sheets = sheetNames;

    const contentBlocks = [];
    let totalRows = 0;

    for (const sheetName of sheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      if (!worksheet) continue;

      // Extract raw rows
      const rawData = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
      if (!rawData || rawData.length === 0) continue;

      // First non-empty row as headers
      let headerRowIndex = 0;
      while (headerRowIndex < rawData.length && (!rawData[headerRowIndex] || rawData[headerRowIndex].every(c => c === ''))) {
        headerRowIndex++;
      }

      if (headerRowIndex >= rawData.length) continue;

      const headers = rawData[headerRowIndex].map((h, i) => String(h || `Col_${i + 1}`).trim());
      const dataRows = rawData.slice(headerRowIndex + 1).filter(r => r && r.some(c => c !== ''));

      const range = worksheet['!ref'] || `A1:${String.fromCharCode(65 + headers.length)}${dataRows.length + 1}`;
      totalRows += dataRows.length;

      // Clean rows to strings/numbers
      const formattedRows = dataRows.map(row => {
        return headers.map((_, colIdx) => {
          const val = row[colIdx];
          if (val === undefined || val === null) return '';
          if (typeof val === 'number') return val;
          if (val instanceof Date) return val.toISOString().split('T')[0];
          return String(val).trim();
        });
      });

      contentBlocks.push({
        type: 'sheet',
        name: sheetName,
        columns: headers,
        rows: formattedRows,
        range: range,
        rowCount: formattedRows.length
      });
    }

    meta.rowCount = totalRows;
    return { contentBlocks, metadata: meta };
  }

  /**
   * Parse PowerPoint (.pptx / .ppt) documents
   */
  static async parsePowerPoint(filePath, ext, meta) {
    const contentBlocks = [];

    if (ext === '.pptx') {
      try {
        const zip = new AdmZip(filePath);
        const zipEntries = zip.getEntries();

        // Slide files are located in ppt/slides/slide1.xml, slide2.xml, etc.
        const slideEntries = zipEntries
          .filter(e => /^ppt\/slides\/slide\d+\.xml$/i.test(e.entryName))
          .sort((a, b) => {
            const numA = parseInt(a.entryName.match(/\d+/)[0], 10);
            const numB = parseInt(b.entryName.match(/\d+/)[0], 10);
            return numA - numB;
          });

        meta.slideCount = slideEntries.length;

        for (let i = 0; i < slideEntries.length; i++) {
          const entry = slideEntries[i];
          const slideNumber = i + 1;
          const xml = entry.getData().toString('utf8');

          // Extract text runs inside <a:t>...</a:t>
          const textRuns = [];
          const regex = /<a:t(?:\s[^>]*)?>([\s\S]*?)<\/a:t>/gi;
          let m;
          while ((m = regex.exec(xml)) !== null) {
            const text = m[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").trim();
            if (text) textRuns.push(text);
          }

          const title = textRuns.length > 0 ? textRuns[0] : `Slide ${slideNumber}`;
          const bodyRuns = textRuns.slice(1);

          contentBlocks.push({
            type: 'slide',
            slideNumber: slideNumber,
            title: title,
            bullets: bodyRuns.length > 0 ? bodyRuns : [],
            text: textRuns.join('\n')
          });
        }
      } catch (err) {
        console.warn('PowerPoint zip parse failed, falling back:', err);
      }
    }

    if (contentBlocks.length === 0) {
      contentBlocks.push({
        type: 'slide',
        slideNumber: 1,
        title: meta.title,
        bullets: ['Presentation uploaded'],
        text: `Presentation document: ${meta.sourceFile}`
      });
      meta.slideCount = 1;
    }

    return { contentBlocks, metadata: meta };
  }

  /**
   * Parse Markdown (.md) documents
   */
  static async parseMarkdown(filePath, meta) {
    const raw = fs.readFileSync(filePath, 'utf8');
    const lines = raw.split(/\r?\n/);
    const contentBlocks = [];

    let currentPara = [];
    let inCodeBlock = false;
    let codeLang = '';
    let codeLines = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.startsWith('```')) {
        if (!inCodeBlock) {
          inCodeBlock = true;
          codeLang = line.replace('```', '').trim();
          codeLines = [];
        } else {
          inCodeBlock = false;
          contentBlocks.push({
            type: 'code',
            language: codeLang || 'text',
            code: codeLines.join('\n')
          });
          codeLines = [];
        }
        continue;
      }

      if (inCodeBlock) {
        codeLines.push(line);
        continue;
      }

      const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
      if (headingMatch) {
        if (currentPara.length > 0) {
          contentBlocks.push({
            type: 'paragraph',
            text: currentPara.join(' ')
          });
          currentPara = [];
        }
        contentBlocks.push({
          type: 'heading',
          level: headingMatch[1].length,
          text: headingMatch[2].trim()
        });
        continue;
      }

      if (!line.trim()) {
        if (currentPara.length > 0) {
          contentBlocks.push({
            type: 'paragraph',
            text: currentPara.join(' ')
          });
          currentPara = [];
        }
      } else {
        currentPara.push(line.trim());
      }
    }

    if (currentPara.length > 0) {
      contentBlocks.push({
        type: 'paragraph',
        text: currentPara.join(' ')
      });
    }

    return { contentBlocks, metadata: meta };
  }

  /**
   * Parse JSON (.json) documents
   */
  static async parseJSON(filePath, meta) {
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    const contentBlocks = [];

    if (Array.isArray(parsed)) {
      contentBlocks.push({
        type: 'paragraph',
        text: `Array containing ${parsed.length} items.`
      });

      // If array of objects, represent as table
      if (parsed.length > 0 && typeof parsed[0] === 'object' && parsed[0] !== null) {
        const headers = Object.keys(parsed[0]);
        const rows = parsed.slice(0, 50).map(item => headers.map(h => String(item[h] !== undefined ? item[h] : '')));
        contentBlocks.push({
          type: 'table',
          name: 'JSON Data',
          headers: headers,
          rows: rows
        });
      }
    } else if (typeof parsed === 'object' && parsed !== null) {
      for (const [key, value] of Object.entries(parsed)) {
        contentBlocks.push({
          type: 'heading',
          level: 2,
          text: key
        });

        if (typeof value === 'object') {
          contentBlocks.push({
            type: 'json_node',
            path: key,
            value: value,
            code: JSON.stringify(value, null, 2)
          });
        } else {
          contentBlocks.push({
            type: 'paragraph',
            text: `${key}: ${String(value)}`
          });
        }
      }
    }

    contentBlocks.push({
      type: 'code',
      language: 'json',
      code: JSON.stringify(parsed, null, 2).slice(0, 10000)
    });

    return { contentBlocks, metadata: meta };
  }

  /**
   * Parse Plain Text (.txt) documents
   */
  static async parseText(filePath, meta) {
    const raw = fs.readFileSync(filePath, 'utf8');
    const paragraphs = raw.split(/\r?\n\s*\r?\n/).map(p => p.trim()).filter(Boolean);
    const contentBlocks = [];

    paragraphs.forEach((p, idx) => {
      const lines = p.split(/\r?\n/);
      if (lines.length === 1 && p.length < 60 && !p.endsWith('.')) {
        contentBlocks.push({
          type: 'heading',
          level: 2,
          text: p,
          page: Math.floor(idx / 5) + 1
        });
      } else {
        contentBlocks.push({
          type: 'paragraph',
          text: p.replace(/\r?\n/g, ' '),
          page: Math.floor(idx / 5) + 1
        });
      }
    });

    meta.pageCount = Math.max(1, Math.ceil(contentBlocks.length / 5));
    return { contentBlocks, metadata: meta };
  }
}

module.exports = DocumentProcessor;
