/**
 * Open Knowledge Format (OKF) Converter and Specification Service
 * Standardizes documents of any format (PDF, DOCX, XLSX, CSV, PPTX, TXT, JSON, MD)
 * into a unified knowledge structure for Document Preview and Gemini AI consumption.
 */

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

class OKFConverter {
  /**
   * Create an OKF Document object
   */
  static createDocument({ id, name, type, size, metadata = {}, content = [] }) {
    const docId = id || 'doc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    const sizeFormatted = formatBytes(size || 0);

    const doc = {
      document: {
        id: docId,
        name: name,
        type: (type || 'unknown').toLowerCase(),
        size: size || 0,
        sizeFormatted: sizeFormatted,
        uploadedAt: new Date().toISOString(),
        status: 'ready'
      },
      metadata: {
        title: metadata.title || name,
        pageCount: metadata.pageCount || (content.filter(c => c.page).length ? Math.max(...content.map(c => c.page || 1)) : undefined),
        sheetCount: metadata.sheetCount || content.filter(c => c.type === 'sheet').length || undefined,
        slideCount: metadata.slideCount || content.filter(c => c.type === 'slide').length || undefined,
        rowCount: metadata.rowCount,
        wordCount: metadata.wordCount || this.estimateWordCount(content),
        author: metadata.author || 'Unknown',
        ...metadata
      },
      content: content,
      chunks: []
    };

    // Generate context chunks for AI semantic search and prompting
    doc.chunks = this.generateChunks(doc);
    return doc;
  }

  /**
   * Stitch fragmented OCR/PDF line breaks into coherent flowing text
   */
  static cleanNarrativeText(text) {
    if (!text || typeof text !== 'string') return '';
    return text
      .replace(/(\w+)-\r?\n(\w+)/g, '$1$2')
      .replace(/(?<![\.\?\!\:\;])\r?\n(?![\n•\-\*\d\.\#])/g, ' ')
      .replace(/[ \t]+/g, ' ')
      .trim();
  }

  /**
   * Estimate word count from content blocks
   */
  static estimateWordCount(content) {
    let words = 0;
    for (const block of content) {
      if (block.text) {
        words += block.text.trim().split(/\s+/).length;
      } else if (block.type === 'sheet' && block.rows) {
        words += block.rows.flat().join(' ').split(/\s+/).length;
      } else if (block.type === 'table' && block.rows) {
        words += block.rows.flat().join(' ').split(/\s+/).length;
      }
    }
    return words;
  }

  /**
   * Generate addressable chunks with source references for retrieval & citation
   */
  static generateChunks(okfDoc) {
    const chunks = [];
    const docName = okfDoc.document.name;
    const docId = okfDoc.document.id;
    const type = okfDoc.document.type;

    let chunkCounter = 0;

    for (const block of okfDoc.content) {
      chunkCounter++;
      const chunkId = `${docId}_chk_${chunkCounter}`;

      if (block.type === 'heading') {
        chunks.push({
          id: chunkId,
          sourceRef: {
            fileName: docName,
            docId: docId,
            type: type,
            page: block.page,
            section: block.text
          },
          text: `## ${block.text}`
        });
      } else if (block.type === 'paragraph') {
        chunks.push({
          id: chunkId,
          sourceRef: {
            fileName: docName,
            docId: docId,
            type: type,
            page: block.page,
            section: block.section || 'General'
          },
          text: block.text
        });
      } else if (block.type === 'table') {
        const tableStr = [
          `| ${block.headers.join(' | ')} |`,
          `| ${block.headers.map(() => '---').join(' | ')} |`,
          ...block.rows.map(r => `| ${r.join(' | ')} |`)
        ].join('\n');

        chunks.push({
          id: chunkId,
          sourceRef: {
            fileName: docName,
            docId: docId,
            type: type,
            page: block.page,
            section: block.name || 'Table'
          },
          text: tableStr
        });
      } else if (block.type === 'sheet') {
        // Break large sheets into blocks of rows with column headers
        const cols = block.columns || [];
        const rows = block.rows || [];
        const chunkSize = 25; // 25 rows per chunk for excel
        
        if (rows.length === 0) {
          chunks.push({
            id: chunkId,
            sourceRef: {
              fileName: docName,
              docId: docId,
              type: type,
              sheet: block.name,
              range: block.range || 'A1'
            },
            text: `Sheet: ${block.name}\nColumns: ${cols.join(', ')}\n(Empty sheet)`
          });
        } else {
          for (let r = 0; r < rows.length; r += chunkSize) {
            const rowSlice = rows.slice(r, r + chunkSize);
            const startRow = r + 2; // assuming row 1 is header
            const endRow = r + 1 + rowSlice.length;
            const endColChar = String.fromCharCode(65 + Math.min(cols.length - 1, 25));
            const rangeStr = `A${startRow}:${endColChar}${endRow}`;

            const sliceText = [
              `Sheet: ${block.name} (Range: ${rangeStr})`,
              `Columns: [${cols.join(', ')}]`,
              ...rowSlice.map((row, idx) => `Row ${startRow + idx}: ${row.join(' | ')}`)
            ].join('\n');

            chunks.push({
              id: `${chunkId}_${r}`,
              sourceRef: {
                fileName: docName,
                docId: docId,
                type: type,
                sheet: block.name,
                range: rangeStr
              },
              text: sliceText
            });
          }
        }
      } else if (block.type === 'slide') {
        const slideText = [
          `Slide ${block.slideNumber}: ${block.title || 'Untitled Slide'}`,
          ...(block.bullets || []).map(b => `• ${b}`),
          block.text ? block.text : ''
        ].filter(Boolean).join('\n');

        chunks.push({
          id: chunkId,
          sourceRef: {
            fileName: docName,
            docId: docId,
            type: type,
            slide: block.slideNumber,
            section: block.title
          },
          text: slideText
        });
      } else if (block.type === 'json_node' || block.type === 'code') {
        chunks.push({
          id: chunkId,
          sourceRef: {
            fileName: docName,
            docId: docId,
            type: type,
            section: block.path || block.language || 'Code'
          },
          text: block.code || JSON.stringify(block.value, null, 2)
        });
      }
    }

    return chunks;
  }

  /**
   * Flatten OKF data structure into searchable, clean readable text
   * Handles TXT, DOCX, PDF (headings, paragraphs, lists, code), Excel/CSV (sheets, headers, cell rows), Slides, JSON
   */
  static extractOKFText(okfDocuments) {
    if (!okfDocuments) return '';
    const docs = Array.isArray(okfDocuments) ? okfDocuments : [okfDocuments];
    const output = [];

    for (const doc of docs) {
      const docName = doc.document?.name || doc.metadata?.title || 'Document';
      const docType = (doc.document?.type || 'unknown').toUpperCase();
      const content = doc.content || [];

      output.push(`--- DOCUMENT: ${docName} (Format: ${docType}) ---`);

      for (const block of content) {
        if (!block) continue;

        if (block.type === 'heading') {
          const level = block.level || 2;
          output.push(`${'#'.repeat(level)} ${block.text}`);
        } else if (block.type === 'paragraph') {
          const pageStr = block.page ? `[Page ${block.page}] ` : '';
          const cleaned = OKFConverter.cleanNarrativeText(block.text);
          if (cleaned) output.push(`${pageStr}${cleaned}`);
        } else if (block.type === 'list' && Array.isArray(block.items)) {
          output.push(block.items.map(item => `• ${item}`).join('\n'));
        } else if (block.type === 'sheet') {
          output.push(`\n[Spreadsheet Sheet: ${block.name}]`);
          const cols = block.columns || [];
          if (cols.length > 0) {
            output.push(`Headers: ${cols.join(' | ')}`);
          }
          const rows = block.rows || [];
          const maxRows = Math.min(rows.length, 300);
          for (let r = 0; r < maxRows; r++) {
            const row = rows[r];
            output.push(`Row ${r + 2}: ${Array.isArray(row) ? row.join(' | ') : row}`);
          }
          if (rows.length > maxRows) {
            output.push(`... and ${rows.length - maxRows} more rows in sheet ${block.name}`);
          }
        } else if (block.type === 'table') {
          const headers = block.headers || [];
          if (headers.length > 0) output.push(`Table Headers: ${headers.join(' | ')}`);
          const rows = block.rows || [];
          for (const row of rows) {
            output.push(Array.isArray(row) ? row.join(' | ') : row);
          }
        } else if (block.type === 'slide') {
          output.push(`\n[Slide ${block.slideNumber || 1}: ${block.title || 'Untitled'}]`);
          if (block.bullets && block.bullets.length > 0) {
            output.push(block.bullets.map(b => `• ${b}`).join('\n'));
          }
          if (block.text) output.push(block.text);
        } else if (block.type === 'code') {
          output.push(`\`\`\`${block.language || ''}\n${block.code}\n\`\`\``);
        } else if (block.text) {
          output.push(block.text);
        } else if (block.data) {
          output.push(typeof block.data === 'string' ? block.data : JSON.stringify(block.data, null, 2));
        }
      }
      output.push(`--- END OF ${docName} ---\n`);
    }

    return output.join('\n\n');
  }

  /**
   * Convert multiple OKF documents into formatted prompt context for Gemini
   * Uses query-aware chunk retrieval to prioritize matching rows, pages, and entities
   */
  static buildPromptContext(okfDocuments, maxChunks = 70, query = '') {
    if (!okfDocuments || okfDocuments.length === 0) {
      return 'No documents provided.';
    }

    // If total text fits within prompt limits, use complete extracted text
    const fullText = this.extractOKFText(okfDocuments);
    if (fullText.length <= 120000) {
      return fullText;
    }

    const queryTokens = (query || '')
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 1);

    let context = '=== UPLOADED DOCUMENTS KNOWLEDGE BASE (OKF) ===\n\n';

    for (const doc of okfDocuments) {
      context += `--- DOCUMENT: ${doc.document.name} (Type: ${doc.document.type.toUpperCase()}) ---\n`;
      context += `Metadata: Title: "${doc.metadata.title || doc.document.name}"`;
      if (doc.metadata.pageCount) context += ` | Pages: ${doc.metadata.pageCount}`;
      if (doc.metadata.sheetCount) context += ` | Sheets: ${doc.metadata.sheetCount}`;
      if (doc.metadata.slideCount) context += ` | Slides: ${doc.metadata.slideCount}`;
      if (doc.metadata.rowCount) context += ` | Total Rows: ${doc.metadata.rowCount}`;
      context += '\n\n';

      const chunks = doc.chunks || [];
      let selectedChunks = [];

      if (queryTokens.length > 0 && chunks.length > maxChunks) {
        // Score chunks based on query tokens
        const scoredChunks = chunks.map((chunk, idx) => {
          const lowerText = chunk.text.toLowerCase();
          let score = 0;
          for (const token of queryTokens) {
            if (lowerText.includes(token)) {
              score += token.length >= 5 ? 10 : 3;
            }
          }
          if (idx === 0) score += 2;
          return { chunk, score, idx };
        });

        scoredChunks.sort((a, b) => b.score - a.score || a.idx - b.idx);
        selectedChunks = scoredChunks.slice(0, maxChunks).map(s => s.chunk);
      } else {
        selectedChunks = chunks.slice(0, maxChunks);
      }

      for (const chunk of selectedChunks) {
        const ref = chunk.sourceRef;
        let refStr = `[Source: ${ref.fileName}`;
        if (ref.page) refStr += ` | Page ${ref.page}`;
        if (ref.sheet) refStr += ` | Sheet: ${ref.sheet}`;
        if (ref.range) refStr += ` | Range: ${ref.range}`;
        if (ref.slide) refStr += ` | Slide ${ref.slide}`;
        if (ref.section) refStr += ` | Section: ${ref.section}`;
        refStr += ']';

        context += `${refStr}\n${chunk.text}\n\n`;
      }
    }

    context += '=== END OF KNOWLEDGE BASE ===';
    return context;
  }
}

module.exports = OKFConverter;
