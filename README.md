# whisper_transcriber_app

Enhanced Whisper Transcriber with improved UI/UX and additional features.

## Features

- Modern, responsive web interface with animated gradient background
- Drag and drop file upload support
- Multiple transcription models (small, base, medium)
- Language selection for transcription
- Task type selection (transcribe or translate)
- Real-time progress logging
- Multiple output formats:
  - Plain text (.txt)
  - SubRip subtitles (.srt)
  - WebVTT subtitles (.vtt)
- Copy to clipboard functionality

## Netlify deployment

To deploy the client on Netlify use the following settings:

```
Build command: pip install -r server/requirements.txt && npm --prefix client ci && npm --prefix client run build
Publish directory: client/dist
```

Netlify will use `requirements.txt` to install the Python dependencies and
`package.json` to run the build script for the Vite based client.

## How it works

The application uses the OpenAI Whisper API for server-side transcription. When you upload a file, it gets sent directly to OpenAI's API endpoint through a Netlify Edge Function that acts as a proxy to keep your API key secure.

For client-side processing, the app uses @xenova/transformers library which implements the Whisper model directly in the browser using WebAssembly.