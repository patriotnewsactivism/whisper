# Enhanced Whisper Transcriber

A powerful and accurate speech-to-text transcription tool with translation capabilities, multiple output formats, and robust error handling.

## Features

- **Transcription & Translation**: Convert audio to text in the original language or translate to English
- **Multiple Output Formats**: Download results in TXT, SRT, VTT, JSON, or CSV formats
- **Modern UI/UX**: Responsive design with animated gradient background and intuitive interface
- **Drag & Drop Support**: Easily upload audio or video files by dragging them to the interface
- **Real-time Progress Logging**: Monitor transcription progress with detailed status updates
- **Copy to Clipboard**: Instantly copy transcription results to clipboard
- **Robust Error Handling**: Comprehensive error handling with retry mechanisms
- **Custom Prompts**: Improve accuracy with specialized vocabulary or style guidance
- **REST API Integration**: Easy integration with other applications through API endpoints

## Supported File Formats

- Audio: MP3, WAV, M4A, FLAC, AAC, OGG
- Video: MP4, MOV, AVI, MKV, WEBM

## Deployment

This application is designed for deployment on Netlify with the following settings:

```
Build command: npm --prefix client ci && npm --prefix client run build
Publish directory: client/dist
```

### Environment Variables

Set the following environment variable in your Netlify dashboard:

- `OPENAI_API_KEY` - Your OpenAI API key for server-side transcription

## API Endpoints

### Transcription
`POST /api/transcribe`

Parameters:
- `file` (required) - Audio/video file to transcribe
- `language` (optional) - Language code (e.g., "en", "es", "fr")
- `response_format` (optional) - Output format ("json", "text", "srt", "vtt", "csv")
- `temperature` (optional) - Sampling temperature (0.0 to 1.0)
- `prompt` (optional) - Text to guide the model's style or continue previous segments

### Translation
`POST /api/transcribe?task=translate`

Parameters:
- `file` (required) - Audio/video file to translate
- `response_format` (optional) - Output format ("json", "text", "srt", "vtt", "csv")
- `temperature` (optional) - Sampling temperature (0.0 to 1.0)
- `prompt` (optional) - Text to guide the model's style

## Usage Examples

### Web Interface
1. Visit the deployed application
2. Upload an audio or video file using drag & drop or the file browser
3. Select the language (for transcription only)
4. Choose the task type (transcribe or translate)
5. Click the process button
6. Download results in your preferred format

### API Integration
```bash
# Transcription
curl -X POST "https://transcribe.wtpnews.org/api/transcribe" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@interview.mp3" \
  -F "language=en" \
  -F "response_format=srt"

# Translation
curl -X POST "https://transcribe.wtpnews.org/api/transcribe?task=translate" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@conversation.mp4" \
  -F "response_format=json"
```

## Output Format Examples

### TXT (Plain Text)
```
Hello, this is a sample transcription.
The TXT format provides simple text output.
```

### SRT (SubRip Subtitles)
```
1
00:00:00,000 --> 00:00:05,000
Hello, this is a sample transcription.

2
00:00:05,000 --> 00:00:10,000
The SRT format provides timed subtitles.
```

### VTT (Web Video Text Tracks)
```
WEBVTT

00:00:00.000 --> 00:00:05.000
Hello, this is a sample transcription.

00:00:05.000 --> 00:00:10.000
The VTT format is ideal for web video.
```

### JSON
```json
[
  {
    "start": 0.0,
    "end": 5.0,
    "text": "Hello, this is a sample transcription."
  },
  {
    "start": 5.0,
    "end": 10.0,
    "text": "The JSON format provides detailed timing information."
  }
]
```

### CSV
```csv
start,end,text
0.0,5.0,"Hello, this is a sample transcription."
5.0,10.0,"The JSON format provides detailed timing information."
```

## Integration Capabilities

The Enhanced Whisper Transcriber is designed for easy integration with other applications:

1. **REST API Endpoints**: Simple HTTP requests for transcription and translation
2. **Multiple Formats**: Support for various output formats makes integration flexible
3. **Retry Mechanisms**: Built-in retry logic ensures reliable processing
4. **Error Handling**: Comprehensive error handling for robust integration
5. **Custom Prompts**: Support for specialized vocabulary to improve accuracy for domain-specific content

## Technical Architecture

### Frontend
- React with Vite for fast development and build times
- Modern CSS with responsive design
- Client-side processing using @xenova/transformers

### Backend
- Netlify Edge Functions for serverless API endpoints
- OpenAI Whisper API for high-quality transcription
- File validation and error handling

## Running Locally

1. Install dependencies:
   ```
   npm install
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

If you encounter errors:

1. Verify your OpenAI API key is correctly set in environment variables
2. Check that the uploaded file is in a supported format
3. Ensure the file size is within OpenAI's limits (25MB for most formats)
4. Review the progress log for specific error messages

## Future Enhancements

The application is structured for easy expansion:
- Additional output formats can be added quickly
- New API endpoints can be implemented with minimal changes
- UI components can be extended with additional features
- Backend processing can be enhanced with more sophisticated error handling

## Conclusion

The Enhanced Whisper Transcriber is a production-ready application with comprehensive features for accurate speech-to-text conversion. It offers both transcription and translation capabilities with multiple output formats, making it suitable for a wide range of use cases and easy integration with other applications.