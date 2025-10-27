const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
require('dotenv').config();

// Database connection will be loaded only if configured

// Import services
const youtubeService = require('./services/youtube-service');
const whisperService = require('./services/whisper-service');

// Routes will be conditionally loaded to avoid optional deps during basic runs

// Note: auth and subscription middleware are only needed when those routes are enabled

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Serve built client when available
try {
  const distPath = path.resolve(__dirname, '../client/dist');
  app.use(express.static(distPath));
} catch (_) {
  // ignore if not present
}

// Initialize database on startup if DATABASE_URL exists
if (process.env.DATABASE_URL) {
  (async () => {
    try {
      const { testConnection, initializeSchema } = require('./db/connection');
      console.log('🔄 Initializing database...');
      const connected = await testConnection();
      if (connected) {
        await initializeSchema();
        console.log('✅ Database ready');
      } else {
        console.log('⚠️  Database not connected - running without persistence');
      }
    } catch (err) {
      console.warn('Database initialization skipped:', err.message);
    }
  })();
}

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 25 * 1024 * 1024 // 25MB limit
  }
});

// API Routes (conditionally mount heavy routes)
if (process.env.DATABASE_URL) {
  try {
    const authRoutes = require('./routes/auth');
    const usageRoutes = require('./routes/usage');
    app.use('/api/auth', authRoutes);
    app.use('/api/usage', usageRoutes);
  } catch (err) {
    console.warn('Auth/Usage routes not mounted:', err.message);
  }
}

if (process.env.DATABASE_URL && process.env.STRIPE_SECRET_KEY) {
  try {
    const billingRoutes = require('./routes/billing');
    app.use('/api/billing', billingRoutes);
  } catch (err) {
    console.warn('Billing routes not mounted:', err.message);
  }
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    services: {
      database: !!process.env.DATABASE_URL,
      stripe: !!process.env.STRIPE_SECRET_KEY,
      elevateai: !!process.env.ELEVATEAI_API_KEY,
      assemblyai: !!process.env.ASSEMBLYAI_API_KEY,
      openai: !!process.env.OPENAI_API_KEY,
      youtube: true
    }
  });
});

// YouTube transcript endpoint
app.post('/api/youtube-transcript', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'YouTube URL is required' });
    }

    const result = await youtubeService.getTranscript(url);
    if (result.success) {
      const transcriptText = result.text || (result.segments || []).map(s => s.text).join(' ');
      return res.json({ transcript: transcriptText, metadata: result.metadata });
    }
    return res.status(500).json({ error: result.error || 'Failed to get YouTube transcript' });
  } catch (error) {
    console.error('YouTube transcript error:', error);
    res.status(500).json({ 
      error: 'Failed to get YouTube transcript',
      details: error.message 
    });
  }
});

// Alias for Netlify-style path when serving static build from Node
app.post('/api/transcribe-youtube', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'YouTube URL is required' });
    }
    const result = await youtubeService.getTranscript(url);
    if (result.success) {
      const transcriptText = result.text || (result.segments || []).map(s => s.text).join(' ');
      return res.json({ transcript: transcriptText, metadata: result.metadata });
    }
    return res.status(500).json({ error: result.error || 'Failed to get YouTube transcript' });
  } catch (error) {
    console.error('YouTube transcript error (alias):', error);
    res.status(500).json({ error: 'Failed to get YouTube transcript', details: error.message });
  }
});

// Audio file transcription endpoint (optionally protected for development)
app.post('/api/transcribe', 
  upload.single('audio'), 
  async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    const filePath = req.file.path;
    const mimeType = req.file.mimetype || 'audio/wav';

    // If OpenAI key missing, return a simple mock so the flow works
    if (!process.env.OPENAI_API_KEY) {
      await fs.unlink(filePath);
      return res.json({
        transcription: `Mock transcription for ${req.file.originalname || 'audio'} (${mimeType}). Add OPENAI_API_KEY to enable real Whisper.`,
        service: 'mock'
      });
    }

    // Use Whisper by default
    const result = await whisperService.transcribeFile(filePath, mimeType);

    // Clean up uploaded file
    await fs.unlink(filePath);

    res.json({ 
      transcription: result.text,
      service: 'whisper'
    });
  } catch (error) {
    console.error('Transcription error:', error);
    
    // Clean up file on error
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting file:', unlinkError);
      }
    }

    res.status(500).json({ 
      error: 'Transcription failed',
      details: error.message 
    });
  }
});

// Alias for Netlify-style upload path using JSON base64 body
app.post('/api/transcribe-upload', async (req, res) => {
  try {
    const { file, fileName, fileType } = req.body || {};
    if (!file || !fileName) {
      return res.status(400).json({ error: 'File data is required' });
    }

    const buffer = Buffer.from(file, 'base64');
    const safeName = String(fileName).replace(/[^a-zA-Z0-9.-]/g, '_');
    const uploadDir = path.resolve(process.cwd(), 'uploads');
    await fs.mkdir(uploadDir, { recursive: true });
    const tmpPath = path.join(uploadDir, `${Date.now()}_${safeName}`);
    await fs.writeFile(tmpPath, buffer);

    if (!process.env.OPENAI_API_KEY) {
      await fs.unlink(tmpPath).catch(() => {});
      return res.json({
        success: true,
        transcript: `Mock transcription for ${safeName} (${fileType || 'audio/*'}). Add OPENAI_API_KEY to enable real Whisper.`,
        service: 'mock'
      });
    }

    const result = await whisperService.transcribeFile(tmpPath, fileType || 'audio/wav');
    await fs.unlink(tmpPath).catch(() => {});

    return res.json({
      success: true,
      transcript: result.text,
      service: 'whisper'
    });
  } catch (error) {
    console.error('JSON upload transcription error:', error);
    return res.status(500).json({ error: 'Transcription failed', details: error.message });
  }
});

// Note: Additional endpoints (recording, AI bot, billing, etc.) can be re-enabled
// once their corresponding services are fully wired. Core transcription endpoints
// above are sufficient for initial functionality.

// Start server (bind to all interfaces for Replit)
app.listen(PORT, () => {
  console.log(`🚀 Enhanced Transcription Server running on port ${PORT}`);
  console.log(`📝 Available services:`);
  console.log(`   - ElevateAI: ${process.env.ELEVATEAI_API_KEY ? '✓' : '✗'}`);
  console.log(`   - AssemblyAI: ${process.env.ASSEMBLYAI_API_KEY ? '✓' : '✗'}`);
  console.log(`   - OpenAI Whisper: ${process.env.OPENAI_API_KEY ? '✓' : '✗'}`);
  console.log(`   - YouTube Transcripts: ✓`);
  console.log(`   - Live Recording: ✓`);
  console.log(`   - AI Bot: ${process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY || process.env.GOOGLE_API_KEY ? '✓' : '✗'}`);
});

module.exports = app;