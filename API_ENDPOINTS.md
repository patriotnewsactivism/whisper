# API Endpoints Documentation

## 🎯 Main Transcription Endpoint

### `POST /.netlify/functions/transcribe`
Main endpoint for all transcription services.

#### Request Format
```json
{
  "service": "whisper|assemblyai|elevateai|youtube",
  "url": "https://example.com/audio-file.mp3",  // for audio files or YouTube URLs
  "fileUrl": "https://storage.example.com/uploaded-file.mp3",  // for uploaded files
  "fileType": "audio/wav",
  "customPrompt": "optional prompt for Whisper/AssemblyAI"
}
```

#### Service-Specific Usage

**Whisper (OpenAI):**
```json
{
  "service": "whisper",
  "fileUrl": "https://example.com/audio.mp3",
  "customPrompt": "This is a podcast about technology"
}
```

**AssemblyAI:**
```json
{
  "service": "assemblyai",
  "fileUrl": "https://example.com/audio.mp3",
  "customPrompt": "Speaker labels enabled"
}
```

**ElevateAI:**
```json
{
  "service": "elevateai",
  "fileUrl": "https://example.com/audio.mp3"
}
```

**YouTube:**
```json
{
  "service": "youtube",
  "url": "https://www.youtube.com/watch?v=VIDEO_ID"
}
```

#### Response Format
```json
{
  "success": true,
  "service": "whisper",
  "result": {
    "text": "Transcribed text...",
    "confidence": 0.95,
    "duration": 120.5,
    "language": "en",
    "segments": [...],
    "service": "whisper"
  },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

## 📁 File Upload Endpoint

### `POST /.netlify/functions/upload`
Upload audio/video files for transcription.

#### Request Format
```json
{
  "file": "base64-encoded-file-data",
  "fileName": "audio.mp3",
  "fileType": "audio/mpeg"
}
```

#### Response Format
```json
{
  "success": true,
  "fileName": "1234567890_audio.mp3",
  "fileUrl": "https://storage.supabase.co/uploads/1234567890_audio.mp3",
  "fileSize": 1024000,
  "uploadedAt": "2024-01-01T12:00:00.000Z"
}
```

## 🧪 Testing & Health Check

### `POST /.netlify/functions/test-all-services`
Test all transcription services configuration.

#### Usage
```bash
# Test all services
curl -X POST https://your-domain.netlify.app/.netlify/functions/test-all-services

# Test specific service
curl -X POST https://your-domain.netlify.app/.netlify/functions/test-all-services \
  -H "Content-Type: application/json" \
  -d '{"service": "whisper"}'
```

#### Response
```json
{
  "success": true,
  "result": {
    "status": "info",
    "message": "All services status",
    "services": {
      "whisper": { "configured": true },
      "assemblyai": { "configured": true },
      "elevateai": { "configured": true },
      "youtube": { "configured": true }
    }
  }
}
```

## 🎤 Live Recording Endpoints

### `POST /.netlify/functions/save-recording`
Save live audio recordings.

### `POST /.netlify/functions/ai-bot`
AI chat functionality for transcription analysis.

## 🚨 Error Handling

### Common 404 Errors and Solutions

1. **"Function not found"**
   - Check the function file exists in `netlify/functions/`
   - Verify function name matches endpoint

2. **"404 on file upload"**
   - Ensure Supabase Storage bucket 'uploads' exists
   - Check Supabase URL and key are configured

3. **"404 on transcription"**
   - Verify all API keys are set in environment variables
   - Check service URLs are accessible

## 🔧 Environment Variables Required

```bash
# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# API Keys
OPENAI_API_KEY=your_openai_key
ASSEMBLYAI_API_KEY=your_assemblyai_key
ELEVATEAI_API_KEY=your_elevateai_key
YOUTUBE_API_KEY=your_youtube_key

# Storage
SUPABASE_STORAGE_BUCKET=uploads
```

## 📋 Testing Script

### Frontend Test
```javascript
// Test all services
async function testServices() {
  const services = ['whisper', 'assemblyai', 'elevateai', 'youtube'];
  
  for (const service of services) {
    const response = await fetch('/.netlify/functions/test-all-services', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ service })
    });
    
    const data = await response.json();
    console.log(`${service}:`, data.result);
  }
}
```

### File Upload Test
```javascript
async function testUpload(file) {
  const reader = new FileReader();
  reader.onload = async (e) => {
    const base64 = e.target.result.split(',')[1];
    
    const response = await fetch('/.netlify/functions/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        file: base64,
        fileName: file.name,
        fileType: file.type
      })
    });
    
    const data = await response.json();
    console.log('Upload result:', data);
  };
  
  reader.readAsDataURL(file);
}
```

## 🎯 Complete Workflow Example

### 1. Upload File
```javascript
const uploadFile = async (file) => {
  const reader = new FileReader();
  reader.onload = async (e) => {
    const base64 = e.target.result.split(',')[1];
    
    const uploadResponse = await fetch('/.netlify/functions/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        file: base64,
        fileName: file.name,
        fileType: file.type
      })
    });
    
    const uploadData = await uploadResponse.json();
    
    if (uploadData.success) {
      // 2. Transcribe uploaded file
      const transcribeResponse = await fetch('/.netlify/functions/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service: 'whisper',
          fileUrl: uploadData.fileUrl,
          fileType: file.type
        })
      });
      
      const transcriptData = await transcribeResponse.json();
      console.log('Transcription:', transcriptData.result);
    }
  };
  
  reader.readAsDataURL(file);
};
```

### 2. YouTube Transcription
```javascript
const transcribeYouTube = async (youtubeUrl) => {
  const response = await fetch('/.netlify/functions/transcribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      service: 'youtube',
      url: youtubeUrl
    })
  });
  
  const data = await response.json();
  return data.result;
};
```