# Multi-Service Transcription App

A comprehensive transcription application with multiple AI services integration including ElevateAI, AssemblyAI, OpenAI Whisper, YouTube transcript extraction, live audio recording, and AI chat bot capabilities.

## Project Overview

This is a full-stack web application consisting of:
- **Frontend**: React + Vite (running on port 5000)
- **Backend**: Express.js server (running on port 3001)
- **Database**: PostgreSQL (Replit-provided database)

### Current State

The application has been successfully configured to run in the Replit environment with:
- Frontend development server running on port 5000 with host 0.0.0.0
- Backend API server running on port 3001
- PostgreSQL database connected and schema initialized
- CORS enabled for cross-origin requests between frontend and backend

## Architecture

### Frontend (`/client`)
- **Framework**: React 18 with Vite
- **Port**: 5000 (configured for Replit proxy)
- **API Communication**: Fetches to `http://localhost:3001/api/*` endpoints
- **Main Components**:
  - `App.jsx` - Main application component with YouTube and file upload transcription
  - `EnhancedTranscription.jsx` - Advanced transcription features
  - `LiveTranscriptionWithRecording.jsx` - Live audio recording
  - `AIBotChat.jsx` - AI assistant chat interface

### Backend (`/server`)
- **Framework**: Express.js
- **Port**: 3001
- **Database**: PostgreSQL with connection pooling
- **Main Services**:
  - ElevateAI transcription
  - AssemblyAI transcription
  - OpenAI Whisper transcription
  - YouTube transcript extraction
  - Live audio recording
  - AI bot routing (OpenAI, Anthropic, Google Gemini)
  - Stripe billing (optional)
  - User authentication (JWT)

### Database Schema

The application uses PostgreSQL with the following tables:
- `users` - User accounts with authentication
- `usage` - Track user usage metrics
- `transcriptions` - Store transcription history
- `invoices` - Billing and payment records

## Development Setup

### Running the Application

Both frontend and backend run automatically via configured workflows:

1. **Frontend Workflow**: 
   - Command: `cd client && npm run dev`
   - Port: 5000
   - Output: Webview

2. **Backend Workflow**:
   - Command: `cd server && node index.js`
   - Port: 3001 (not exposed externally)
   - Output: Console

### Environment Variables

The application requires various API keys and configuration. Set these in the Replit Secrets:

**Required for full functionality:**
- `ELEVATEAI_API_KEY` - For ElevateAI transcription service
- `ASSEMBLYAI_API_KEY` - For AssemblyAI transcription service
- `OPENAI_API_KEY` - For OpenAI Whisper and GPT services
- `ANTHROPIC_API_KEY` - For Claude AI services
- `GOOGLE_API_KEY` (or `GEMINI_API_KEY`) - For Google Gemini services
- `STRIPE_SECRET_KEY` - For billing features
- `JWT_SECRET` - For user authentication

**Auto-configured by Replit:**
- `DATABASE_URL` - PostgreSQL connection string
- `PORT` - Server port (defaults to 3001)

**Optional:**
- `AWS_ACCESS_KEY_ID` - For S3 storage
- `AWS_SECRET_ACCESS_KEY` - For S3 storage
- `S3_BUCKET_NAME` - S3 bucket for recordings
- `AWS_REGION` - AWS region (default: us-east-1)

### Available Endpoints

**Health & Status:**
- `GET /api/health` - Check server and service status

**YouTube Transcription:**
- `POST /api/youtube-transcript` - Get transcript from YouTube URL
  ```json
  { "url": "https://youtube.com/watch?v=..." }
  ```

**Audio Transcription:**
- `POST /api/transcribe` - Upload and transcribe audio file
  - Accepts FormData with 'audio' field
  - File size limit: 25MB
  - Returns transcription with service used

**Live Recording:**
- `POST /api/recording/start` - Start recording session
- `POST /api/recording/stop` - Stop recording session
- `GET /api/recording/status/:sessionId` - Get recording status

**AI Bot:**
- `POST /api/ai-bot` - Chat with AI assistant
  ```json
  {
    "message": "Your question",
    "context": "optional context",
    "preferredService": "openai|anthropic|gemini"
  }
  ```

**Authentication:**
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

**Billing (requires Stripe):**
- `POST /api/billing/create-checkout-session` - Create payment session
- `POST /api/billing/create-portal-session` - Manage subscription
- `GET /api/billing/subscription` - Get subscription details

## Key Configuration Changes

### For Replit Environment

1. **Vite Config** (`client/vite.config.js`):
   - Port: 5000 (Replit's frontend port)
   - Host: 0.0.0.0 (required for Replit proxy)
   - HMR client port: 5000

2. **API URLs** (`client/src/App.jsx` and other components):
   - Changed from Netlify functions to Express backend
   - Base URL: `http://localhost:3001`

3. **Server Binding** (`server/index.js`):
   - No specific host binding (binds to all interfaces)
   - Database initialization is async and non-blocking

4. **Conditional Service Initialization**:
   - Stripe only initializes if API key is present
   - Services gracefully handle missing API keys

## Project Structure

```
.
├── client/                 # React frontend
│   ├── src/
│   │   ├── App.jsx        # Main app component
│   │   ├── EnhancedTranscription.jsx
│   │   ├── LiveTranscriptionWithRecording.jsx
│   │   ├── AIBotChat.jsx
│   │   ├── contexts/      # React contexts
│   │   └── pages/         # Page components
│   ├── vite.config.js
│   └── package.json
├── server/                 # Express backend
│   ├── db/
│   │   └── connection.js  # Database connection
│   ├── middleware/
│   │   ├── auth.js        # JWT authentication
│   │   └── subscription.js # Usage limits
│   ├── models/
│   │   └── User.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── billing.js
│   │   └── usage.js
│   ├── services/
│   │   ├── elevateai-service.js
│   │   ├── assemblyai-service.js
│   │   ├── whisper-service.js
│   │   ├── youtube-service.js
│   │   ├── transcription-orchestrator.js
│   │   ├── audio-recorder-service.js
│   │   ├── ai-bot-router.js
│   │   ├── stripe-service.js
│   │   └── usage-service.js
│   ├── index.js           # Server entry point
│   └── package.json
├── .gitignore
├── package.json           # Root package.json
└── replit.md             # This file
```

## Recent Changes (GitHub Import Setup)

1. Updated Vite configuration for Replit port 5000 and host binding
2. Changed frontend API calls from Netlify functions to Express backend
3. Removed authentication requirements for development (transcription and AI bot endpoints)
4. Made Stripe service initialization conditional
5. Fixed transcription orchestrator duplicate class definitions
6. Improved database error handling to prevent server crashes
7. Configured workflows for both frontend and backend

## Known Limitations

- Authentication is currently optional (disabled for development)
- Usage tracking requires authenticated users
- Billing features require Stripe configuration
- Some transcription services require API keys to function

## Next Steps

To enable full functionality:
1. Add API keys for transcription services (ElevateAI, AssemblyAI, OpenAI)
2. Configure Stripe for billing features
3. Set up authentication flow for production
4. Add usage limits and billing integration
5. Configure AWS S3 for recording storage

## Support & Documentation

- Main README: `/README.md`
- API Documentation: `/API_ENDPOINTS.md`
- Client README: `/client/README.md`
- Server README: `/server/README.md`
