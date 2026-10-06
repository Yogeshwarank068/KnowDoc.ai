const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// Load environment variables from backend/.env or .env
const envPath = fs.existsSync(path.join(__dirname, '.env')) 
  ? path.join(__dirname, '.env')
  : path.join(__dirname, '..', '.env');
dotenv.config({ path: envPath });

const { router: documentsRouter } = require('./routes/documents');
const chatRouter = require('./routes/chat');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Health / Status endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'KnowDoc.ai Backend',
    version: '1.0.0',
    geminiConfigured: !!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() && process.env.GEMINI_API_KEY.trim() !== 'your_key'),
    model: process.env.GEMINI_MODEL || 'gemini-3.5-flash'
  });
});

// Settings endpoint
app.get('/api/settings', (req, res) => {
  const hasKey = !!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() && process.env.GEMINI_API_KEY.trim() !== 'your_key');
  res.json({
    hasApiKey: hasKey,
    model: process.env.GEMINI_MODEL || 'gemini-3.5-flash',
    maskedKey: hasKey ? `••••••••${process.env.GEMINI_API_KEY.slice(-4)}` : ''
  });
});

app.post('/api/settings', (req, res) => {
  const { apiKey, model } = req.body;
  if (apiKey !== undefined) {
    process.env.GEMINI_API_KEY = apiKey.trim();
  }
  if (model) {
    process.env.GEMINI_MODEL = model.trim();
  }
  
  // Try persisting to .env
  try {
    const targetEnv = path.join(__dirname, '.env');
    const content = `PORT=${PORT}\nGEMINI_API_KEY=${process.env.GEMINI_API_KEY || ''}\nGEMINI_MODEL=${process.env.GEMINI_MODEL || 'gemini-3.5-flash'}\n`;
    fs.writeFileSync(targetEnv, content, 'utf8');
  } catch (e) {
    console.warn('Could not write to .env:', e.message);
  }

  res.json({
    success: true,
    hasApiKey: !!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim()),
    model: process.env.GEMINI_MODEL
  });
});

// API Routes
app.use('/api/documents', documentsRouter);
app.use('/api/chat', chatRouter);

// Serve Frontend static assets
const frontendDir = path.join(__dirname, '..', 'frontend');
if (fs.existsSync(frontendDir)) {
  app.use(express.static(frontendDir));
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      return res.sendFile(path.join(frontendDir, 'index.html'));
    }
    next();
  });
}

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({
    error: err.message || 'Internal Server Error'
  });
});

app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`  KnowDoc.ai Server running on http://localhost:${PORT}`);
  console.log(`  Gemini API Status: ${process.env.GEMINI_API_KEY ? 'Configured ✓' : 'Ready (OKF Engine fallback active)'}`);
  console.log(`======================================================\n`);
});
