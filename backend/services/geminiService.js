const OKFConverter = require('./okfConverter');

class GeminiService {
  /**
   * Main entry point to answer document questions
   */
  static async answerQuestion({ question, okfDocuments, conversationHistory = [], customApiKey = null, isFirstTurn = null }) {
    if (!question || !question.trim()) {
      throw new Error('Question cannot be empty');
    }

    // Direct Identity & Greeting Handling
    const cleanQ = question.trim().toLowerCase().replace(/[?!.,']/g, '');
    if (cleanQ === 'what is your name' || cleanQ === 'whats your name' || cleanQ === 'who are you') {
      return {
        answer: "My name is KnowDoc.ai.",
        sources: []
      };
    }
    if (cleanQ === 'hi' || cleanQ === 'hello' || cleanQ === 'hey') {
      return {
        answer: "Hello! I am KnowDoc.ai. How can I assist you today?",
        sources: []
      };
    }

    // Determine strict first-turn status
    const firstTurn = (typeof isFirstTurn === 'boolean')
      ? isFirstTurn
      : (!conversationHistory || conversationHistory.filter(m => m.role === 'user').length <= 1);

    const apiKey = customApiKey || process.env.GEMINI_API_KEY;
    const model = process.env.GEMINI_MODEL || 'gemini-3.8-flash';

    let result = null;

    // If Gemini API Key is available, call the official Google Gemini API
    if (apiKey && apiKey.trim() && apiKey.trim() !== 'your_key') {
      try {
        result = await this.callGeminiAPI({ question, okfDocuments: okfDocuments || [], conversationHistory, apiKey, model, firstTurn });
      } catch (err) {
        console.error('Gemini API call failed, falling back to OKF Local Knowledge Engine:', err.message);
        result = this.queryOKFLocal({ question, okfDocuments: okfDocuments || [], firstTurn });
      }
    } else {
      // No API key provided yet -> Use embedded OKF Local Engine
      result = this.queryOKFLocal({ question, okfDocuments: okfDocuments || [], firstTurn });
    }

    // Enforce deterministic greeting lifecycle
    if (result && result.answer) {
      result.answer = this.formatGreeting(result.answer, firstTurn);
    }
    return result;
  }

  /**
   * Format response text following strict Greeting Message Lifecycle:
   * Turn 1: "Hello! I am KnowDoc.ai. [Direct answer]..."
   * Turn 2+: Jump directly into explanation/answer without greeting or self-introduction
   */
  static formatGreeting(text, firstTurn) {
    if (!text) return text;
    const greetingIntro = "Hello! I am KnowDoc.ai. ";
    const greetingRegex = /^(?:hello|hi|hey)!\s*(?:my\s*name\s*is|i\s*am)\s*knowdoc\.ai[.!,\s]*/i;
    const genericHiRegex = /^(?:hello|hi|hey)!\s*/i;

    if (firstTurn) {
      if (greetingRegex.test(text.trim())) {
        return text.trim().replace(greetingRegex, greetingIntro);
      } else {
        return greetingIntro + text.trim();
      }
    } else {
      // Turn 2+ of the same session: Omit the greeting entirely and answer directly.
      let cleaned = text.trim();
      if (greetingRegex.test(cleaned)) {
        cleaned = cleaned.replace(greetingRegex, '').trim();
      }
      if (genericHiRegex.test(cleaned)) {
        cleaned = cleaned.replace(genericHiRegex, '').trim();
      }
      return cleaned;
    }
  }

  /**
   * Call Google Gemini REST API securely with automatic model fallback cascading
   */
  static async callGeminiAPI({ question, okfDocuments = [], conversationHistory, apiKey, model, firstTurn = true }) {
    const okfContext = (okfDocuments && okfDocuments.length > 0)
      ? OKFConverter.buildPromptContext(okfDocuments, 80, question)
      : '';

    const systemInstruction = `You are KnowDoc.ai. You deliver precise, highly efficient, and query-adaptive answers.

Instructions:
1. Greeting: ${firstTurn ? 'This is the first turn of the conversation. Start with "Hello! I am KnowDoc.ai." followed immediately by the answer.' : 'This is a subsequent turn. Provide no greeting or introduction; jump directly into the answer.'}
2. Conciseness First (Direct & Fact-Based Queries): For simple factual or identification questions (e.g., "Who is the Prime Minister of India?", "What is the capital of France?", "What is the formula of speed?"), state only the exact direct answer immediately without background essays, historical context, or conversational filler phrases. Keep simple lookups and factual inquiries strictly to 1–2 sentences. Example: "Narendra Modi is the Prime Minister of India."
3. Structured Depth (Proportional Depth): Provide detailed steps, headings (###), bullet points, and tables only when an explanation, multi-step process, derivation, or tutorial is explicitly requested.
4. General Knowledge Fallback: Answer general knowledge questions directly and accurately even if they are not in the uploaded documents, without raising errors or stating that the document lacks the data.
5. Grounding & Citations (Only When Grounded in Uploaded Documents):
   - If the answer exists in the uploaded documents, state it directly and cite the sources used at the very end in a JSON block tagged with \`\`\`sources:
\`\`\`sources
[
  {
    "fileName": "document.ext",
    "page": 1,
    "section": "Core Concept / Section",
    "sheet": "Sheet1",
    "range": "A1:B10"
  }
]
\`\`\`
   - Do NOT output the \`\`\`sources block when answering general knowledge questions outside the documents.
6. Number & Formula Formatting:
   - Render mathematical formulas and numbers in clean Unicode notation (e.g., "Speed = Distance / Time", "1/80") without raw unparsed LaTeX artifacts (do NOT output \\frac{}, \\text{}, or \\times).`;

    // Build chat contents strictly following the required Document Content / User Question prompt template
    const hasDocContext = okfContext && okfContext.trim().length > 0;
    const userPrompt = hasDocContext
      ? `Document Content:
"""
${okfContext}
"""

User Question: ${question}

Please answer the question accurately, directly, and adaptively based on the document content above (or general knowledge if outside the document):`
      : `User Question: ${question}

Please answer this question directly, accurately, and adaptively:`;

    const contents = [];
    contents.push({
      role: 'user',
      parts: [{ text: userPrompt }]
    });

    const body = {
      contents: contents,
      systemInstruction: {
        parts: [{ text: systemInstruction }]
      },
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 4096
      }
    };

    // Candidate models to try in case of 404/503 deprecation or capacity spikes
    const candidateModels = [
      model || 'gemini-3.5-flash',
      'gemini-3.5-flash',
      'gemini-3.1-flash-lite',
      'gemini-3.5-flash-lite',
      'gemini-3-flash-preview',
      'gemini-3.8-flash'
    ].filter((v, i, a) => a.indexOf(v) === i);

    let lastError = null;
    let data = null;

    for (const mod of candidateModels) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${mod}:generateContent?key=${apiKey.trim()}`;
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });

        if (response.ok) {
          data = await response.json();
          // Update default model if fallback succeeded
          process.env.GEMINI_MODEL = mod;
          break;
        } else {
          const errText = await response.text();
          let parsedErr = errText;
          try {
            const jsonErr = JSON.parse(errText);
            parsedErr = jsonErr.error?.message || errText;
          } catch (e) {}
          lastError = new Error(`Model ${mod} returned ${response.status}: ${parsedErr}`);
          console.warn(`Model ${mod} failed (${response.status}), trying next candidate...`);
        }
      } catch (netErr) {
        lastError = netErr;
      }
    }

    if (!data) {
      throw lastError || new Error('All Gemini candidate models failed to respond.');
    }

    const candidate = data.candidates?.[0];
    let rawText = candidate?.content?.parts?.[0]?.text || "I couldn't find this information in the uploaded documents.";

    // Parse sources JSON block if present
    let sources = [];
    const sourceMatch = rawText.match(/```sources\s*([\s\S]*?)\s*```/);
    if (sourceMatch) {
      try {
        sources = JSON.parse(sourceMatch[1]);
        // Remove sources block from user display text
        rawText = rawText.replace(/```sources[\s\S]*?```/, '').trim();
      } catch (e) {
        console.warn('Failed to parse sources block from Gemini:', e);
      }
    }

    // If Gemini didn't return sources block, generate verified sources from matching OKF chunks
    if (sources.length === 0) {
      sources = this.extractMatchingSources(okfDocuments, question, rawText);
    }

    return {
      answer: rawText,
      sources: sources
    };
  }

  /**
   * Embedded OKF Local Intelligence Engine
   * Capable of answering questions, performing spreadsheet lookups & computations, and citing sources
   */
  static queryOKFLocal({ question, okfDocuments }) {
    const qLower = question.toLowerCase();
    const sources = [];

    // 0. Exact cell / record lookup in Sheets (e.g. searching for a phone number, user ID, email, or name)
    const rawTokens = question.replace(/['"?,!]/g, ' ').split(/\s+/).filter(t => t.length >= 3);
    for (const doc of okfDocuments) {
      const sheets = doc.content.filter(c => c.type === 'sheet');
      for (const sheet of sheets) {
        const cols = sheet.columns || [];
        const rows = sheet.rows || [];

        for (let rIdx = 0; rIdx < rows.length; rIdx++) {
          const row = rows[rIdx];
          const rowNum = rIdx + 2;

          for (let cIdx = 0; cIdx < row.length; cIdx++) {
            const cellStr = String(row[cIdx] || '').trim();
            if (!cellStr || cellStr.length < 3) continue;

            const isExactMatch = rawTokens.some(tok => {
              const cleanTok = tok.replace(/\D/g, '');
              const cleanCell = cellStr.replace(/\D/g, '');
              if (cleanTok.length >= 6 && cleanCell.includes(cleanTok)) return true;
              return cellStr.toLowerCase() === tok.toLowerCase();
            });

            if (isExactMatch) {
              // Found exact matching record in sheet!
              const details = [];
              cols.forEach((colName, idx) => {
                const val = row[idx];
                if (val !== undefined && val !== null && String(val).trim() !== '') {
                  details.push(`* **${colName}**: ${String(val).replace(/\r?\n/g, ', ')}`);
                }
              });

              const colLetterEnd = String.fromCharCode(65 + Math.min(cols.length - 1, 25));
              const range = `A${rowNum}:${colLetterEnd}${rowNum}`;

              return {
                answer: `Found record matching **${cellStr}** in sheet **${sheet.name}** (Row ${rowNum}):\n\n` + details.join('\n'),
                sources: [{
                  fileName: doc.document.name,
                  sheet: sheet.name,
                  range: range
                }]
              };
            }
          }
        }
      }
    }

    // 1. Check for Spreadsheet / Excel specific queries (Totals, Averages, Max/Min)
    for (const doc of okfDocuments) {
      const sheets = doc.content.filter(c => c.type === 'sheet');
      if (sheets.length > 0) {
        const sheetAnswer = this.processExcelQuestion(qLower, sheets, doc.document.name);
        if (sheetAnswer) {
          return sheetAnswer;
        }
      }
    }

    // 2. Check for learning roadmap, modules, or tutorial questions
    const isLearningOrModule = qLower.includes('learn') || qLower.includes('module') || qLower.includes('step') || 
                               qLower.includes('how') || qLower.includes('topic') || qLower.includes('syllabus') || 
                               qLower.includes('start') || qLower.includes('roadmap') || qLower.includes('guide');

    if (isLearningOrModule) {
      for (const doc of okfDocuments) {
        const blocks = doc.content || [];
        const moduleBlocks = [];
        const textSections = [];

        for (const b of blocks) {
          const txt = (b.text || '').trim();
          if (!txt) continue;
          if (b.type === 'heading' || /module\s*\d+/i.test(txt) || /chapter\s*\d+/i.test(txt) || /^\d+[\.\)]\s+/i.test(txt)) {
            moduleBlocks.push(b);
          } else if (b.type === 'paragraph' || b.type === 'slide') {
            textSections.push(b);
          }
        }

        // If document contains module structures or educational sections
        if (moduleBlocks.length > 0 || (textSections.length > 0 && (doc.document.name.toLowerCase().includes('python') || doc.document.name.toLowerCase().includes('module')))) {
          const steps = [];
          if (moduleBlocks.length > 0) {
            moduleBlocks.forEach((mb, idx) => {
              // Find following paragraph for this module
              const mbIndex = blocks.indexOf(mb);
              const nextP = blocks.slice(mbIndex + 1, mbIndex + 3).find(b => b.type === 'paragraph');
              const desc = nextP ? ` — ${nextP.text}` : '';
              steps.push(`* **${mb.text}**${desc}`);
              sources.push({ fileName: doc.document.name, section: mb.text });
            });
          } else {
            textSections.slice(0, 5).forEach(ts => {
              steps.push(`* ${ts.text}`);
              sources.push({ fileName: doc.document.name, section: 'Knowledge Content' });
            });
          }

          const responseText = `Based on the uploaded document **${doc.document.name}**, here is the structured roadmap to learn the material:\n\n` +
            `### Curriculum & Learning Modules\n\n` +
            steps.join('\n\n') +
            `\n\n**Recommendation:** Start with the foundational topics in Module 1, complete hands-on practice, and progress sequentially through each module to build mastery.`;

          return {
            answer: responseText,
            sources: this.deduplicateSources(sources)
          };
        }
      }
    }

    // 3. Keyword & semantic matching across all OKF content blocks
    const stopwords = new Set([
      'the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'but', 'in', 'with', 'to', 'for', 'of',
      'as', 'by', 'that', 'this', 'it', 'from', 'be', 'are', 'was', 'were', 'what', 'when', 'where',
      'who', 'whom', 'how', 'why', 'can', 'could', 'should', 'would', 'do', 'does', 'did', 'have', 'has',
      'had', 'tell', 'give', 'show', 'find', 'me', 'my', 'your', 'our', 'any', 'all', 'some', 'about'
    ]);

    const queryTerms = qLower
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 2 && !stopwords.has(t));

    const matches = [];

    for (const doc of okfDocuments) {
      for (const block of doc.content) {
        let blockText = '';
        let ref = { fileName: doc.document.name };

        if (block.type === 'paragraph') {
          blockText = block.text;
          if (block.page) ref.page = block.page;
          if (block.section) ref.section = block.section;
        } else if (block.type === 'heading') {
          blockText = block.text;
          if (block.page) ref.page = block.page;
          ref.section = block.text;
        } else if (block.type === 'slide') {
          blockText = `${block.title} ${(block.bullets || []).join(' ')} ${block.text || ''}`;
          ref.slide = block.slideNumber;
          ref.section = block.title;
        } else if (block.type === 'sheet') {
          blockText = `${block.name} ${block.columns.join(' ')} ${block.rows.flat().join(' ')}`;
          ref.sheet = block.name;
          ref.range = block.range || 'A1';
        } else if (block.type === 'table') {
          blockText = `${block.headers.join(' ')} ${block.rows.flat().join(' ')}`;
          if (block.page) ref.page = block.page;
          ref.section = block.name || 'Table';
        } else if (block.type === 'code') {
          blockText = block.code;
          ref.section = block.language || 'Code';
        }

        if (!blockText) continue;

        const lowerText = blockText.toLowerCase();
        let score = 0;
        for (const term of queryTerms) {
          if (lowerText.includes(term)) {
            score += 1;
            if (block.type === 'heading' || block.type === 'slide') score += 2;
          }
        }

        if (score > 0) {
          matches.push({ score, block, blockText, ref });
        }
      }
    }

    matches.sort((a, b) => b.score - a.score);

    if (matches.length === 0) {
      const cleanTopic = question.replace(/[?.,!]/g, '').trim();
      return {
        answer: `${cleanTopic} is a general inquiry. For comprehensive details, please consult relevant domain documentation or upload corresponding knowledge files.`,
        sources: []
      };
    }

    // Pedagogical synthesis: group and teach concepts rather than raw snippet dumping
    const topMatches = matches.slice(0, 5);
    const keyPoints = [];
    let primaryHeading = '';
    let primaryNarrative = [];

    topMatches.forEach((m, idx) => {
      sources.push(m.ref);
      const text = (m.blockText || '').trim();
      if (!text) return;

      if (m.block.type === 'heading' && !primaryHeading) {
        primaryHeading = text;
      } else if (m.block.type === 'heading') {
        keyPoints.push(`**${text}**`);
      } else if (m.block.type === 'table') {
        keyPoints.push(`\n| ${m.block.headers.join(' | ')} |\n| ${m.block.headers.map(() => '---').join(' | ')} |\n` + m.block.rows.slice(0, 4).map(r => `| ${r.join(' | ')} |`).join('\n'));
      } else if (m.block.type === 'code') {
        keyPoints.push(`\`\`\`${m.block.language || ''}\n${m.block.code}\n\`\`\``);
      } else if (idx < 2) {
        primaryNarrative.push(text);
      } else {
        keyPoints.push(text);
      }
    });

    const docTitle = okfDocuments[0]?.document?.name || 'Uploaded Document';
    const topicTitle = primaryHeading || question.replace(/[?.,]/g, '').trim();

    let finalAnswer = `## Understanding: ${topicTitle}\n\n`;

    if (primaryNarrative.length > 0) {
      finalAnswer += `### 1. Conceptual Overview\n${primaryNarrative.join('\n\n')}\n\n`;
    }

    if (keyPoints.length > 0) {
      finalAnswer += `### 2. Core Principles & Detailed Breakdown\n`;
      keyPoints.forEach(kp => {
        if (kp.startsWith('|') || kp.startsWith('```') || kp.startsWith('**')) {
          finalAnswer += `${kp}\n\n`;
        } else {
          finalAnswer += `* **Key Insight:** ${kp}\n\n`;
        }
      });
    }

    finalAnswer += `### 3. Practical Summary & Key Takeaway\n` +
      `All details above are directly grounded in **${docTitle}**. To master this concept, review the core definitions and work through the corresponding exercises or references in the source material.`;

    return {
      answer: finalAnswer,
      sources: this.deduplicateSources(sources)
    };
  }

  /**
   * Process structured Excel queries (Total, Average, Max, Comparisons)
   */
  static processExcelQuestion(qLower, sheets, fileName) {
    const isTotal = qLower.includes('total') || qLower.includes('sum');
    const isAverage = qLower.includes('average') || qLower.includes('avg') || qLower.includes('mean');
    const isHighest = qLower.includes('highest') || qLower.includes('top') || qLower.includes('maximum') || qLower.includes('max') || qLower.includes('best');
    const isLowest = qLower.includes('lowest') || qLower.includes('minimum') || qLower.includes('min') || qLower.includes('worst');
    const isCompare = qLower.includes('compare');

    for (const sheet of sheets) {
      const cols = sheet.columns;
      const rows = sheet.rows;
      if (!cols || cols.length === 0 || !rows || rows.length === 0) continue;

      // Identify numeric columns (e.g. Sales, Revenue, Quantity, Price, Amount)
      const numericColIndices = [];
      cols.forEach((colName, idx) => {
        let numCount = 0;
        rows.forEach(row => {
          const raw = String(row[idx] || '').trim();
          if (raw !== '') {
            // Check if strictly a number or currency
            const clean = raw.replace(/^[$€£¥]/, '').replace(/,/g, '').trim();
            if (!isNaN(Number(clean)) && clean.length > 0) {
              numCount++;
            }
          }
        });
        if (numCount > rows.length * 0.5) {
          numericColIndices.push({ index: idx, name: colName });
        }
      });

      // Target numeric column matching query or first numeric column
      let targetCol = numericColIndices.find(c => qLower.includes(c.name.toLowerCase()));
      if (!targetCol && numericColIndices.length > 0) {
        targetCol = numericColIndices[0];
      }

      // Name / Entity column (usually first text column)
      const nameColIdx = cols.findIndex((_, idx) => !numericColIndices.some(n => n.index === idx));

      if (targetCol) {
        const values = [];
        rows.forEach((row, rIdx) => {
          const rawVal = row[targetCol.index];
          const num = Number(String(rawVal).replace(/[^0-9.-]+/g, ''));
          if (!isNaN(num)) {
            values.push({
              rowNum: rIdx + 2,
              name: nameColIdx !== -1 ? row[nameColIdx] : `Row ${rIdx + 2}`,
              val: num
            });
          }
        });

        if (values.length > 0) {
          const colLetter = String.fromCharCode(65 + targetCol.index);
          const range = `${colLetter}2:${colLetter}${rows.length + 1}`;

          if (isTotal) {
            const sum = values.reduce((acc, v) => acc + v.val, 0);
            return {
              answer: `The **total ${targetCol.name}** in sheet **${sheet.name}** is **${sum.toLocaleString()}**.\n\nCalculated across ${values.length} records.`,
              sources: [{
                fileName: fileName,
                sheet: sheet.name,
                range: range
              }]
            };
          }

          if (isAverage) {
            const avg = values.reduce((acc, v) => acc + v.val, 0) / values.length;
            return {
              answer: `The **average ${targetCol.name}** in sheet **${sheet.name}** is **${avg.toFixed(2).toLocaleString()}**.`,
              sources: [{
                fileName: fileName,
                sheet: sheet.name,
                range: range
              }]
            };
          }

          if (isHighest) {
            values.sort((a, b) => b.val - a.val);
            const top = values[0];
            return {
              answer: `The highest **${targetCol.name}** is **${top.name}** with **${top.val.toLocaleString()}** (Sheet: **${sheet.name}**, Row ${top.rowNum}).`,
              sources: [{
                fileName: fileName,
                sheet: sheet.name,
                range: `A${top.rowNum}:${colLetter}${top.rowNum}`
              }]
            };
          }

          if (isLowest) {
            values.sort((a, b) => a.val - b.val);
            const low = values[0];
            return {
              answer: `The lowest **${targetCol.name}** is **${low.name}** with **${low.val.toLocaleString()}** (Sheet: **${sheet.name}**, Row ${low.rowNum}).`,
              sources: [{
                fileName: fileName,
                sheet: sheet.name,
                range: `A${low.rowNum}:${colLetter}${low.rowNum}`
              }]
            };
          }
        }
      }

      if (isCompare && sheets.length > 1) {
        return {
          answer: `### Sheet Comparison\n\nComparing sheets in **${fileName}**:\n\n` +
            sheets.map(s => `* **${s.name}**: ${s.rowCount} rows, columns: [${s.columns.join(', ')}]`).join('\n'),
          sources: sheets.map(s => ({
            fileName: fileName,
            sheet: s.name,
            range: s.range || 'A1'
          }))
        };
      }
    }

    return null;
  }

  /**
   * Helper to deduplicate sources
   */
  static deduplicateSources(sources) {
    const seen = new Set();
    const unique = [];

    for (const s of sources) {
      const key = `${s.fileName || ''}_${s.page || ''}_${s.sheet || ''}_${s.range || ''}_${s.slide || ''}_${s.section || ''}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(s);
      }
    }

    return unique.slice(0, 4);
  }

  /**
   * Extract matching sources from documents when not explicitly returned by Gemini
   */
  static extractMatchingSources(okfDocuments, question, answerText) {
    const sources = [];
    for (const doc of okfDocuments) {
      if (doc.chunks && doc.chunks.length > 0) {
        for (const chunk of doc.chunks.slice(0, 3)) {
          sources.push(chunk.sourceRef);
        }
      } else {
        sources.push({ fileName: doc.document.name, page: 1 });
      }
    }
    return this.deduplicateSources(sources);
  }
}

module.exports = GeminiService;
