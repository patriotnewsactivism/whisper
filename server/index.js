const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
require('dotenv').config();

// Import services
const { transcribeWithElevateAI } = require('./services/elevateai-service');
const { getYouTubeTranscript } = require('./services/youtube-service');
const { selectTranscriptionService } = require('./services/transcription-orchestrator');
const { startRecording, stopRecording, getRecordingStatus } = require('./services/audio-recorder-service');
const { routeAIRequest } = require('./services/ai-bot-router');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 25 * 1024 * 1024 // 25MB limit
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    services: {
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

// Audio file transcription endpoint
app.post('/api/transcribe', upload.single('audio'), async (req, res) => {
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

    // Clean up uploaded file
    await fs.unlink(filePath);

    res.json({ 
      transcription,
      service: selectedService 
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

// AI Bot endpoint
app.post('/api/ai-bot', async (req, res) => {
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

// Start server
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