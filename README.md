# Whisper Transcriber

A powerful and accurate speech-to-text transcription tool using OpenAI's Whisper API.

## Features

- Modern, responsive web interface with animated gradient background
- Drag and drop file upload support
- Language selection for transcription
- Custom prompt support for specialized vocabulary
- Real-time progress logging
- Multiple output formats:
  - Plain text (.txt)
  - SubRip subtitles (.srt)
  - WebVTT subtitles (.vtt)
- Copy to clipboard functionality
- Server-side processing using OpenAI Whisper API
- Client-side processing using @xenova/transformers library

## Netlify Deployment

To deploy the client on Netlify use the following settings:

```
Build command: npm --prefix client ci && npm --prefix client run build
Publish directory: client/dist
```

Netlify will use `package.json` to run the build script for the Vite based client.

## How it works

The application uses the OpenAI Whisper API for server-side transcription. When you upload a file, it gets sent directly to OpenAI's API endpoint through a Netlify Edge Function that acts as a proxy to keep your API key secure.

For client-side processing, the app uses @xenova/transformers library which implements the Whisper model directly in the browser using WebAssembly.

## API Endpoint

- `POST /api/transcribe` - Transcribe audio to text in the specified language

## Environment Variables

Set the following environment variable in your Netlify dashboard:

- `OPENAI_API_KEY` - Your OpenAI API key for server-side transcription

## Usage

1. Upload an audio or video file using drag & drop or the file browser
2. Select the language for transcription
3. Optionally add a custom prompt for specialized vocabulary or style guidance
4. Click the "Transcribe" button
5. Download results in your preferred format

## Supported File Formats

- Audio: MP3, WAV, M4A, FLAC, AAC, OGG
- Video: MP4, MOV, AVI, MKV, WEBM

## Error Handling

The application includes robust error handling with detailed logging and retry mechanisms to ensure reliable transcription even if temporary issues occur with the OpenAI API.

## Integration

To integrate with other applications, make a POST request to the `/api/transcribe` endpoint with a multipart/form-data payload containing the audio file and optional parameters.

Example:
```bash
curl -X POST "https://transcribe.wtpnews.org/api/transcribe" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@audio.mp3" \
  -F "language=en"
```

## Accuracy

OpenAI's Whisper API is considered one of the most accurate speech-to-text transcription services available. It performs well on a variety of audio conditions and supports multiple languages with high accuracy.