const express = require('express');
const GeminiService = require('../services/geminiService');
const { getDocumentsByIds, documentsStore } = require('./documents');

const router = express.Router();

// In-memory chat storage for session chats
const chatSessions = new Map();

/**
 * POST /api/chat
 * Answer a question using selected OKF documents via Gemini API or OKF Engine
 */
router.post('/', async (req, res) => {
  try {
    const { documentIds, okfDocuments, question, conversationHistory, customApiKey, chatId, isFirstTurn } = req.body;

    if (!question || !question.trim()) {
      return res.status(400).json({ error: 'Question cannot be empty.' });
    }

    let selectedDocs = [];

    // Support client-sent OKF documents
    if (okfDocuments && Array.isArray(okfDocuments) && okfDocuments.length > 0) {
      selectedDocs = okfDocuments;
      // Auto-cache into documentsStore
      for (const d of selectedDocs) {
        if (d && d.document && d.document.id) {
          documentsStore.set(d.document.id, d);
        }
      }
    } else if (documentIds && Array.isArray(documentIds) && documentIds.length > 0) {
      selectedDocs = getDocumentsByIds(documentIds);
    } else if (documentsStore.size > 0) {
      selectedDocs = Array.from(documentsStore.values());
    } else {
      selectedDocs = [];
    }

    // Call GeminiService
    const result = await GeminiService.answerQuestion({
      question: question.trim(),
      okfDocuments: selectedDocs,
      conversationHistory: conversationHistory || [],
      customApiKey: customApiKey,
      isFirstTurn: typeof isFirstTurn === 'boolean' ? isFirstTurn : ((conversationHistory || []).filter(m => m.role === 'user').length <= 1)
    });

    // Save message in server session if chatId provided
    const id = chatId || 'chat_' + Date.now();
    let session = chatSessions.get(id);
    if (!session) {
      session = { id, title: question.slice(0, 40), messages: [], createdAt: new Date().toISOString() };
      chatSessions.set(id, session);
    }
    session.messages.push({ role: 'user', content: question, timestamp: new Date().toISOString() });
    session.messages.push({ role: 'assistant', content: result.answer, sources: result.sources, timestamp: new Date().toISOString() });

    return res.json({
      chatId: id,
      answer: result.answer,
      sources: result.sources || []
    });
  } catch (err) {
    console.error('Error in /api/chat:', err);
    return res.status(500).json({
      error: `Failed to generate answer: ${err.message}`
    });
  }
});

/**
 * GET /api/chat/:id
 * Retrieve a specific chat session
 */
router.get('/:id', (req, res) => {
  const session = chatSessions.get(req.params.id);
  if (!session) {
    return res.status(404).json({ error: 'Chat session not found' });
  }
  res.json({ session });
});

module.exports = router;
