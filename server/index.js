const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
require('dotenv').config();

// Import database
const { testConnection, initializeSchema } = require('./db/connection');

// Import services
const { transcribeWithElevateAI } = require('./services/elevateai-service');
const { getYouTubeTranscript } = require('./services/youtube-service');
const { selectTranscriptionService } = require('./services/transcription-orchestrator');
const { startRecording, stopRecording, getRecordingStatus } = require('./services/audio-recorder-service');
const { routeAIRequest } = require('./services/ai-bot-router');
const { initializeUsage, trackTranscription } = require('./services/usage-service');

// Import routes
const authRoutes = require('./routes/auth');
const billingRoutes = require('./routes/billing');
const usageRoutes = require('./routes/usage');

// Import middleware
const { authenticate } = require('./middleware/auth');
const { checkUsageLimit, requireFeature } = require('./middleware/subscription');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize database on startup
(async () => {
  console.log('🔄 Initializing database...');
  const connected = await testConnection();
  if (connected) {
    await initializeSchema();
    console.log('✅ Database ready');
  } else {
    console.log('⚠️  Database not connected - running without persistence');
  }
})();

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 25 * 1024 * 1024 // 25MB limit
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/usage', usageRoutes);

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

    const transcript = await getYouTubeTranscript(url);
    res.json({ transcript });
  } catch (error) {
    console.error('YouTube transcript error:', error);
    res.status(500).json({ 
      error: 'Failed to get YouTube transcript',
      details: error.message 
    });
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
    const fileSize = req.file.size;
    const mimeType = req.file.mimetype;

    // Select the best service for this file
    const selectedService = selectTranscriptionService(fileSize, mimeType);
    
    let transcription;
    
    switch (selectedService) {
      case 'elevateai':
        transcription = await transcribeWithElevateAI(filePath);
        break;
      case 'assemblyai':
        // Import AssemblyAI service dynamically
        const { transcribeWithAssemblyAI } = require('./services/assemblyai-service');
        transcription = await transcribeWithAssemblyAI(filePath);
        break;
      case 'openai':
        // Import OpenAI Whisper service dynamically
        const { transcribeWithWhisper } = require('./services/whisper-service');
        transcription = await transcribeWithWhisper(filePath);
        break;
      default:
        throw new Error('No suitable transcription service available');
    }

    // Track usage (if user is authenticated)
    if (req.user) {
      const durationMinutes = Math.ceil(fileSize / (1024 * 1024 * 2)); // Rough estimate
      trackTranscription(req.user.userId, durationMinutes);
    }

    // Clean up uploaded file
    await fs.unlink(filePath);

    res.json({ 
      transcription,
      service: selectedService,
      minutesUsed: durationMinutes
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

// Live recording endpoints
app.post('/api/recording/start', async (req, res) => {
  try {
    const { sessionId } = req.body;
    const result = await startRecording(sessionId);
    res.json(result);
  } catch (error) {
    console.error('Start recording error:', error);
    res.status(500).json({ 
      error: 'Failed to start recording',
      details: error.message 
    });
  }
});

app.post('/api/recording/stop', async (req, res) => {
  try {
    const { sessionId } = req.body;
    const result = await stopRecording(sessionId);
    res.json(result);
  } catch (error) {
    console.error('Stop recording error:', error);
    res.status(500).json({ 
      error: 'Failed to stop recording',
      details: error.message 
    });
  }
});

app.get('/api/recording/status/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const status = await getRecordingStatus(sessionId);
    res.json(status);
  } catch (error) {
    console.error('Get recording status error:', error);
    res.status(500).json({ 
      error: 'Failed to get recording status',
      details: error.message 
    });
  }
});

// AI Bot endpoint (optionally protected for development)
app.post('/api/ai-bot',
  async (req, res) => {
  try {
    const { message, context, preferredService } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const response = await routeAIRequest(message, context, preferredService);
    res.json(response);
  } catch (error) {
    console.error('AI Bot error:', error);
    res.status(500).json({ 
      error: 'AI request failed',
      details: error.message 
    });
  }
});

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