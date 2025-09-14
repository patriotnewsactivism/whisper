# Whisper Transcriber

A powerful and accurate speech-to-text transcription tool using OpenAI's Whisper API.
=======
# Enhanced Whisper Transcriber App

A powerful and accurate speech-to-text transcription tool using OpenAI's Whisper API with client-side processing capabilities.

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
  - JSON format (.json)
  - CSV format (.csv)
- Copy to clipboard functionality
- Server-side processing using OpenAI Whisper API
- Client-side processing using @xenova/transformers library
- Retry mechanisms for API calls
- Error handling and logging

## Netlify Deployment

To deploy the client on Netlify, use the following settings:

```
Build command: npm --prefix client ci && npm --prefix client run build
Publish directory: client/dist
```

Netlify will use `package.json` to run the build script for the Vite based client.
=======
Netlify will use `requirements.txt` to install the Python dependencies and
`package.json` to run the build script for the Vite-based client.

### Environment Variables

Set the following environment variable in your Netlify dashboard:

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
=======
- `OPENAI_API_KEY` - Your OpenAI API key for server-side transcription

## How It Works

The application uses both server-side and client-side processing for maximum flexibility:

1. **Server-side processing**: When you upload a file, it gets sent directly to OpenAI's API endpoint through a Netlify Edge Function that acts as a proxy to keep your API key secure.

2. **Client-side processing**: For privacy-conscious users, the app uses the @xenova/transformers library which implements the Whisper model directly in the browser using WebAssembly.

## API Endpoints

### Server-side Endpoints

- `POST /api/transcribe` - Transcribe audio to text in the specified language
- `POST /api/translate` - Translate audio to English text

Both endpoints accept multipart/form-data with the following parameters:
- `file` (required) - The audio file to process
- `language` (optional) - Language code for transcription (e.g., "en", "es", "fr")
- `response_format` (optional) - Output format ("json", "text", "srt", "vtt")
- `temperature` (optional) - Sampling temperature (0.0 to 1.0)
- `prompt` (optional) - Optional text to guide the model's style or continue a previous audio segment

### Client-side Functionality

The client-side processing uses the @xenova/transformers library with the following models:
- `Xenova/whisper-small.en` - Fast and accurate English-only model
- `Xenova/whisper-base.en` - Fastest English-only model
- `Xenova/whisper-medium.en` - More accurate but slower English-only model

## Output Formats

1. **Plain Text (.txt)** - Simple text transcription
2. **SubRip Subtitles (.srt)** - Subtitle format with timestamps
3. **WebVTT Subtitles (.vtt)** - Web Video Text Tracks format
4. **JSON (.json)** - Structured data with detailed timing information
5. **CSV (.csv)** - Comma-separated values format for easy data analysis

## Integration Capabilities

This application is designed to be easily integrated into other projects:

1. **API Endpoints**: All functionality is available through REST API endpoints
2. **Multiple Formats**: Support for various output formats makes integration flexible
3. **Retry Mechanisms**: Built-in retry logic ensures reliable processing
4. **Error Handling**: Comprehensive error handling for robust integration

## Running Locally

1. Install dependencies:
   ```
   npm install
   pip install -r server/requirements.txt
   ```

2. Build the client:
   ```
   npm --prefix client run build
   ```

3. Start the server:
   ```
   npm start
   ```

4. Visit `http://localhost:5000` in your browser

## Troubleshooting

If you encounter errors during transcription:

1. Check that your OpenAI API key is correctly set in the environment variables
2. Verify that the uploaded file is in a supported format (MP3, WAV, MP4, MOV, etc.)
3. Ensure the file size is within OpenAI's limits (25MB for most formats)
4. Check the progress log for specific error messages

## Custom Vocabulary Support

To improve transcription accuracy for specific terms, you can use the prompt parameter with specialized vocabulary.

## Speaker Diarization

The application includes basic speaker diarization capabilities through the faster-whisper library, which can distinguish between different speakers in the audio.

## Timestamp Formatting Options

Multiple timestamp formats are supported:
- SRT format: HH:MM:SS,mmm
- VTT format: HH:MM:SS.mmm
