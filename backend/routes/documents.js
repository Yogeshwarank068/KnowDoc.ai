const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const DocumentProcessor = require('../services/documentProcessor');

const router = express.Router();

// Upload storage configuration
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// In-memory / persistent registry for OKF documents
const documentsStore = new Map();

// Load any existing saved OKF documents from disk
const dbFilePath = path.join(uploadsDir, 'documents_db.json');
function loadPersistedDocs() {
  if (fs.existsSync(dbFilePath)) {
    try {
      const data = JSON.parse(fs.readFileSync(dbFilePath, 'utf8'));
      for (const doc of data) {
        if (doc && doc.document && doc.document.id) {
          documentsStore.set(doc.document.id, doc);
        }
      }
      console.log(`Loaded ${documentsStore.size} persisted documents from db.`);
    } catch (e) {
      console.warn('Failed to load persisted documents:', e);
    }
  }

  // Auto-recover any files in uploadsDir not yet in documentsStore
  try {
    const files = fs.readdirSync(uploadsDir);
    for (const f of files) {
      if (f.startsWith('.') || f.endsWith('.json') || f.endsWith('.gitkeep')) continue;
      const fullPath = path.join(uploadsDir, f);
      // Clean original name (strip leading timestamp prefix if present)
      const originalName = f.replace(/^\d+-\d+-/, '');
      const alreadyLoaded = Array.from(documentsStore.values()).some(d => d.storedPath === fullPath || d.document.name === originalName);
      if (!alreadyLoaded) {
        try {
          DocumentProcessor.processFile(fullPath, originalName, 'application/octet-stream').then(okfDoc => {
            okfDoc.storedPath = fullPath;
            documentsStore.set(okfDoc.document.id, okfDoc);
            persistDocs();
            console.log(`Auto-recovered document: ${originalName} (${okfDoc.document.id})`);
          });
        } catch (e) {
          console.warn(`Could not auto-recover ${f}:`, e.message);
        }
      }
    }
  } catch (scanErr) {
    console.warn('Upload directory scan warning:', scanErr);
  }
}
function persistDocs() {
  try {
    const list = Array.from(documentsStore.values());
    fs.writeFileSync(dbFilePath, JSON.stringify(list, null, 2), 'utf8');
  } catch (e) {
    console.warn('Failed to persist documents:', e);
  }
}
loadPersistedDocs();

// Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + '-' + file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_'));
  }
});

// 20 MB limit per file (20 * 1024 * 1024 bytes)
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 20 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    const allowedExts = ['.pdf', '.docx', '.doc', '.xlsx', '.xls', '.csv', '.pptx', '.ppt', '.txt', '.json', '.md', '.markdown'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file format "${ext}". Allowed: PDF, Word, Excel, CSV, PowerPoint, TXT, JSON, Markdown.`));
    }
  }
});

/**
/**
 * Upload handler for processing documents into Open Knowledge Format (OKF)
 */
const handleUpload = (req, res) => {
  upload.array('files', 10)(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          error: 'File size exceeds the 20 MB limit. Please upload a smaller file.'
        });
      }
      return res.status(400).json({ error: `Upload error: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files were provided for upload.' });
    }

    const processedDocuments = [];
    const errors = [];

    for (const file of req.files) {
      try {
        const okfDoc = await DocumentProcessor.processFile(file.path, file.originalname, file.mimetype);
        okfDoc.storedPath = file.path;
        documentsStore.set(okfDoc.document.id, okfDoc);
        processedDocuments.push(okfDoc);
      } catch (procErr) {
        console.error(`Failed to process ${file.originalname}:`, procErr);
        errors.push({ file: file.originalname, error: procErr.message });
        // Clean up temporary file
        try { if (fs.existsSync(file.path)) fs.unlinkSync(file.path); } catch (e) {}
      }
    }

    persistDocs();

    return res.status(200).json({
      success: true,
      documents: processedDocuments.map(d => ({
        ...d.document,
        metadata: d.metadata,
        okf: d
      })),
      errors: errors.length > 0 ? errors : undefined
    });
  });
};

router.post('/upload', handleUpload);
router.post('/', handleUpload);

/**
 * GET /api/documents
 * List all uploaded documents
 */
router.get('/', (req, res) => {
  const list = Array.from(documentsStore.values()).map(doc => ({
    ...doc.document,
    metadata: doc.metadata
  }));
  res.json({ documents: list });
});

/**
 * GET /api/documents/:id
 * Retrieve full OKF document data including content blocks for preview
 */
router.get('/:id', (req, res) => {
  const doc = documentsStore.get(req.params.id);
  if (!doc) {
    return res.status(404).json({ error: 'Document not found' });
  }
  res.json({ document: doc });
});

/**
 * DELETE /api/documents/:id
 * Delete document from store and disk
 */
router.delete('/:id', (req, res) => {
  const doc = documentsStore.get(req.params.id);
  if (!doc) {
    return res.status(404).json({ error: 'Document not found' });
  }

  // Remove file from disk
  if (doc.storedPath && fs.existsSync(doc.storedPath)) {
    try {
      fs.unlinkSync(doc.storedPath);
    } catch (e) {
      console.warn('Failed to delete file from disk:', e);
    }
  }

  documentsStore.delete(req.params.id);
  persistDocs();

  res.json({ success: true, message: `Document ${doc.document.name} deleted successfully.` });
});

// Export helper to retrieve OKF documents for chat
function getDocumentsByIds(ids) {
  if (!ids || ids.length === 0) {
    // If no ids specified, return all documents
    return Array.from(documentsStore.values());
  }
  return ids.map(id => documentsStore.get(id)).filter(Boolean);
}

module.exports = {
  router,
  getDocumentsByIds,
  documentsStore
};
