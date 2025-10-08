# 🎙️ Enhanced Multi-Service Transcription App

A comprehensive transcription application that integrates multiple AI services including ElevateAI, AssemblyAI, OpenAI Whisper, YouTube transcript extraction, live audio recording, and AI chat bot capabilities.

## ✨ Features

### 🎯 Core Transcription Services
- **ElevateAI Integration** - High-quality transcription with speaker diarization
- **AssemblyAI** - Fast and accurate speech-to-text
- **OpenAI Whisper** - State-of-the-art multilingual transcription
- **YouTube Transcripts** - Extract transcripts from any YouTube video
- **Intelligent Service Selection** - Automatically chooses the best service based on file size and type

### 🎤 Live Recording Features
- **Real-time Audio Recording** - Record audio directly in the browser
- **Live Transcription** - Get transcriptions as you record
- **Session Management** - Track and manage multiple recording sessions
- **Cloud Storage** - Optional S3 integration for storing recordings

### 🤖 AI Chat Bot
- **Multi-Provider Support** - OpenAI GPT-4, Anthropic Claude, Google Gemini
- **Context-Aware** - Maintains conversation context
- **Smart Routing** - Automatically selects the best AI service
- **Transcription Integration** - Chat about your transcriptions

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- API keys for the services you want to use

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/patriotnewsactivism/whisper.git
cd whisper
```

2. **Install dependencies**
```bash
# Install root dependencies
npm install

# Install server dependencies
npm run server:install

# Install client dependencies
cd client && npm install && cd ..
```

3. **Configure environment variables**
```bash
cp .env.example .env
```

Edit `.env` and add your API keys:
```env
# Required for transcription services
ELEVATEAI_API_KEY=your_elevateai_key
ASSEMBLYAI_API_KEY=your_assemblyai_key
OPENAI_API_KEY=your_openai_key

# Required for AI bot features
ANTHROPIC_API_KEY=your_anthropic_key
GEMINI_API_KEY=your_gemini_key

# Optional: For cloud storage of recordings
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
S3_BUCKET_NAME=your_bucket_name
AWS_REGION=us-east-1

# Server configuration
PORT=3001
NODE_ENV=development
```

4. **Start the application**

**Development mode** (with hot reload):
```bash
npm run dev:full
```

This starts:
- Backend server on `http://localhost:3001`
- Frontend dev server on `http://localhost:5173`

**Production mode**:
```bash
# Build the client
npm run build

# Start the server
npm start
```

## 📖 Usage Guide

### YouTube Transcription
1. Navigate to the YouTube tab
2. Paste a YouTube video URL
3. Click "Get Transcript"
4. View and download the transcript

### Audio File Transcription
1. Go to the Audio Upload tab
2. Select an audio file (MP3, WAV, M4A, etc.)
3. The app automatically selects the best transcription service
4. View results with timestamps and speaker labels

### Live Recording
1. Click on the "Live Recording" tab
2. Click "Start Recording" to begin
3. Speak into your microphone
4. Click "Stop Recording" when done
5. Get instant transcription of your recording

### AI Chat Bot
1. Open the "AI Assistant" tab
2. Type your question or request
3. The bot can help with:
   - Summarizing transcriptions
   - Answering questions about content
   - General conversation
   - Content analysis

## 🏗️ Project Structure

```
whisper/
├── client/                 # React frontend
│   ├── src/
│   │   ├── App.jsx        # Main app component
│   │   ├── App.css        # Main styles
│   │   ├── LiveTranscriptionWithRecording.jsx
│   │   ├── AIBotChat.jsx
│   │   └── EnhancedFeatures.css
│   └── package.json
├── server/                 # Express backend
│   ├── services/          # Service modules
│   │   ├── elevateai-service.js
│   │   ├── youtube-service.js
│   │   ├── transcription-orchestrator.js
│   │   ├── audio-recorder-service.js
│   │   └── ai-bot-router.js
│   ├── index.js           # Server entry point
│   └── package.json
├── netlify/
│   └── functions/         # Serverless functions
│       ├── ai-bot.js
│       └── save-recording.js
├── .env.example           # Environment variables template
├── package.json           # Root package.json
└── README.md             # This file
```

## 🔧 API Endpoints

### Transcription Endpoints
- `POST /api/transcribe` - Upload and transcribe audio file
- `POST /api/youtube-transcript` - Get YouTube video transcript
- `GET /api/health` - Check service status

### Recording Endpoints
- `POST /api/recording/start` - Start a recording session
- `POST /api/recording/stop` - Stop a recording session
- `GET /api/recording/status/:sessionId` - Get recording status

### AI Bot Endpoint
- `POST /api/ai-bot` - Send message to AI assistant

## 🧪 Testing

Run service tests:
```bash
npm run test:services
```

This will verify:
- All API keys are configured correctly
- Services are accessible
- Basic functionality works

## 📦 Deployment

### Netlify Deployment

1. **Connect your repository to Netlify**

2. **Configure build settings**:
   - Build command: `npm run build`
   - Publish directory: `client/dist`

3. **Add environment variables** in Netlify dashboard:
   - All API keys from `.env.example`

4. **Deploy**:
```bash
./deploy-enhanced.sh
```

### Manual Deployment

1. Build the client:
```bash
cd client && npm run build
```

2. Deploy the `client/dist` folder to your hosting service

3. Deploy the server to a Node.js hosting platform (Heroku, Railway, etc.)

## 🔑 Getting API Keys

### ElevateAI
1. Visit [ElevateAI](https://elevateai.com)
2. Sign up for an account
3. Navigate to API settings
4. Generate an API key

### AssemblyAI
1. Visit [AssemblyAI](https://www.assemblyai.com)
2. Create an account
3. Go to your dashboard
4. Copy your API key

### OpenAI
1. Visit [OpenAI Platform](https://platform.openai.com)
2. Sign up or log in
3. Go to API keys section
4. Create a new API key

### Anthropic (Claude)
1. Visit [Anthropic](https://www.anthropic.com)
2. Request API access
3. Once approved, get your API key from the console

### Google Gemini
1. Visit [Google AI Studio](https://makersuite.google.com)
2. Sign in with your Google account
3. Create an API key

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For issues and questions:
1. Check the [documentation](./NEW_FEATURES_GUIDE.md)
2. Review [deployment guide](./DEPLOYMENT_SUMMARY.md)
3. Check [what's still needed](./WHATS_STILL_NEEDED.md)
4. Open an issue on GitHub

## 🎉 Acknowledgments

- ElevateAI for transcription services
- AssemblyAI for speech-to-text
- OpenAI for Whisper and GPT models
- Anthropic for Claude
- Google for Gemini
- YouTube for transcript API

---

**Version 2.0.0** - Enhanced with live recording and AI bot capabilities