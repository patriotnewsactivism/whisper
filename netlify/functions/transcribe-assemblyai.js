/**
 * AssemblyAI transcription service for large files
 * Supports files up to 2GB
 */

import axios from 'axios';

const ASSEMBLYAI_API_KEY = process.env.ASSEMBLYAI_API_KEY || '851a775a5877446c840ec17cc5aba38c';

// AssemblyAI API endpoints
const ASSEMBLYAI_BASE_URL = 'https://api.assemblyai.com/v2';

// Error handling utilities
class TranscriptionError extends Error {
  constructor(message, code, details = null) {
    super(message);
    this.name = 'TranscriptionError';
    this.code = code;
    this.details = details;
  }
}

// Helper function to create error responses
const createErrorResponse = (error, statusCode = 500) => {
  console.error('AssemblyAI Transcription Error:', error);
  
  return {
    statusCode,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      success: false,
      error: error.message,
      code: error.code || 'TRANSCRIPTION_ERROR',
      details: error.details
    })
  };
};

// Helper function to validate file size
const validateFileSize = (size) => {
  const maxSize = 2 * 1024 * 1024 * 1024; // 2GB
  if (size > maxSize) {
    throw new TranscriptionError(
      `File size ${(size / 1024 / 1024).toFixed(1)}MB exceeds 2GB limit`,
      'FILE_TOO_LARGE'
    );
  }
  return true;
};

// Helper function to determine if AssemblyAI should be used
const shouldUseAssemblyAI = (fileSize, fileType) => {
  // Use AssemblyAI for files >25MB or when Whisper fails
  const whisperLimit = 25 * 1024 * 1024;
  return fileSize > whisperLimit || 
         fileType.includes('video') ||
         fileType === 'audio/m4a';
};

// Upload file to AssemblyAI
const uploadFileToAssemblyAI = async (fileBuffer, fileType) => {
  try {
    const uploadResponse = await axios.post(
      `${ASSEMBLYAI_BASE_URL}/upload`,
      fileBuffer,
      {
        headers: {
          'authorization': ASSEMBLYAI_API_KEY,
          'content-type': 'application/octet-stream'
        }
      }
    );

    return uploadResponse.data.upload_url;
  } catch (error) {
    throw new TranscriptionError(
      'Failed to upload file to AssemblyAI',
      'UPLOAD_FAILED',
      error.response?.data || error.message
    );
  }
};

// Submit transcription request
const submitTranscriptionRequest = async (audioUrl, options = {}) => {
  const {
    language = null,
    punctuate = true,
    format_text = true,
    speaker_labels = false,
    word_boost = [],
    filter_profanity = false
  } = options;

  const requestBody = {
    audio_url: audioUrl,
    language_code: language,
    punctuate,
    format_text,
    speaker_labels,
    word_boost,
    filter_profanity
  };

  // Remove null values
  Object.keys(requestBody).forEach(key => {
    if (requestBody[key] === null || requestBody[key] === undefined) {
      delete requestBody[key];
    }
  });

  try {
    const response = await axios.post(
      `${ASSEMBLYAI_BASE_URL}/transcript`,
      requestBody,
      {
        headers: {
          'authorization': ASSEMBLYAI_API_KEY,
          'content-type': 'application/json'
        }
      }
    );

    return response.data.id;
  } catch (error) {
    throw new TranscriptionError(
      'Failed to submit transcription request',
      'SUBMIT_FAILED',
      error.response?.data || error.message
    );
  }
};

// Poll transcription status
const pollTranscriptionStatus = async (transcriptId, maxWait = 300000) => { // 5 minutes max
  const startTime = Date.now();
  const pollInterval = 3000; // 3 seconds

  while (Date.now() - startTime < maxWait) {
    try {
      const response = await axios.get(
        `${ASSEMBLYAI_BASE_URL}/transcript/${transcriptId}`,
        {
          headers: {
            'authorization': ASSEMBLYAI_API_KEY
          }
        }
      );

      const { status, text, error } = response.data;

      if (status === 'completed') {
        return response.data;
      }

      if (status === 'error') {
        throw new TranscriptionError(
          `Transcription failed: ${error}`,
          'TRANSCRIPTION_FAILED',
          error
        );
      }

      // Still processing
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    } catch (error) {
      if (error instanceof TranscriptionError) {
        throw error;
      }
      throw new TranscriptionError(
        'Failed to check transcription status',
        'POLL_FAILED',
        error.message
      );
    }
  }

  throw new TranscriptionError(
    'Transcription polling timeout',
    'TIMEOUT'
  );
};

// Format transcript for different output types
const formatTranscript = (transcript, format) => {
  const { text, words = [], utterances = [] } = transcript;

  switch (format) {
    case 'json':
      return {
        text,
        words: words.map(w => ({
          word: w.text,
          start: w.start ? w.start / 1000 : 0,
          end: w.end ? w.end / 1000 : 0,
          confidence: w.confidence || 0.95
        })),
        segments: utterances.map(u => ({
          text: u.text,
          start: u.start ? u.start / 1000 : 0,
          end: u.end ? u.end / 1000 : 0,
          speaker: u.speaker || 'unknown'
        }))
      };

    case 'srt':
      return generateSRT(words && words.length > 0 ? words : [{ text, start: 0, end: 0 }]);

    case 'vtt':
      return generateVTT(words && words.length > 0 ? words : [{ text, start: 0, end: 0 }]);

    case 'csv':
      return generateCSV(words && words.length > 0 ? words : [{ text, start: 0, end: 0 }]);

    case 'txt':
    default:
      return { text };
  }
};

// Generate SRT format
const generateSRT = (words) => {
  if (!words || words.length === 0) return { text: '' };

  const segments = [];
  let currentSegment = [];
  let segmentStart = 0;
  const maxDuration = 5000; // 5 seconds per segment

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    if (!word || !word.text) continue;

    if (currentSegment.length === 0) {
      segmentStart = word.start || 0;
    }
    currentSegment.push(word.text);

    const wordEnd = word.end || (word.start || 0) + 1000;
    if (wordEnd - segmentStart > maxDuration || i === words.length - 1) {
      segments.push({
        start: segmentStart,
        end: wordEnd,
        text: currentSegment.join(' ')
      });
      currentSegment = [];
    }
  }

  const srtContent = segments.map((segment, index) => 
    `${index + 1}\n${formatTime(segment.start)} --> ${formatTime(segment.end)}\n${segment.text}`
  ).join('\n\n');
  
  return { text: srtContent };
};

// Generate VTT format
const generateVTT = (words) => {
  const srtData = generateSRT(words);
  const vttContent = srtData.text ? 
    'WEBVTT\n\n' + srtData.text.replace(/\n\n/g, '\n\n') : 
    'WEBVTT\n\n';
  
  return { text: vttContent };
};

// Generate CSV format
const generateCSV = (words) => {
  if (!words || words.length === 0) return { text: '' };

  const headers = 'Start Time,End Time,Word,Confidence\n';
  const rows = words.map(word => {
    if (!word || !word.text) return '';
    const start = word.start ? word.start / 1000 : 0;
    const end = word.end ? word.end / 1000 : 0;
    const confidence = word.confidence || 0.95;
    return `${start},${end},"${word.text.replace(/"/g, '""')}",${confidence}`;
  }).filter(row => row).join('\n');

  return { text: headers + rows };
};

// Format time for SRT/VTT
const formatTime = (ms) => {
  if (typeof ms !== 'number' || isNaN(ms)) ms = 0;
  const totalMs = Math.max(0, Math.floor(ms));
  
  const hours = Math.floor(totalMs / 3600000);
  const minutes = Math.floor((totalMs % 3600000) / 60000);
  const seconds = Math.floor((totalMs % 60000) / 1000);
  const milliseconds = totalMs % 1000;

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
};

// Main handler function
export const handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return createErrorResponse(
      new TranscriptionError('Method not allowed', 'INVALID_METHOD'),
      405
    );
  }

  try {
    // Parse multipart form data
    const contentType = event.headers['content-type'] || '';
    const boundary = contentType.split('boundary=')[1];
    
    if (!boundary) {
      throw new TranscriptionError(
        'Invalid multipart form data - no boundary found',
        'INVALID_FORM_DATA'
      );
    }

    // Handle base64 encoded body
    let bodyBuffer;
    if (event.isBase64Encoded) {
      bodyBuffer = Buffer.from(event.body, 'base64');
    } else {
      bodyBuffer = Buffer.from(event.body);
    }

    // Simple multipart parsing
    const boundaryBuffer = Buffer.from(`--${boundary}`);
    const parts = [];
    let start = 0;
    
    while (true) {
      const boundaryIndex = bodyBuffer.indexOf(boundaryBuffer, start);
      if (boundaryIndex === -1) break;
      
      const partStart = boundaryIndex + boundaryBuffer.length + 2; // Skip \r\n
      const nextBoundary = bodyBuffer.indexOf(boundaryBuffer, partStart);
      const partEnd = nextBoundary === -1 ? bodyBuffer.length : nextBoundary - 2;
      
      if (partEnd > partStart) {
        parts.push(bodyBuffer.slice(partStart, partEnd));
      }
      
      start = partEnd + 2;
    }

    let fileBuffer = null;
    let fileType = 'audio/mpeg';
    let options = {};

    for (const part of parts) {
      const partStr = part.toString();
      
      if (partStr.includes('filename=')) {
        const contentTypeMatch = partStr.match(/Content-Type:\s*([^\r\n]+)/);
        if (contentTypeMatch) {
          fileType = contentTypeMatch[1].trim();
        }

        const headerEnd = part.indexOf('\r\n\r\n');
        if (headerEnd !== -1) {
          const dataStart = headerEnd + 4;
          fileBuffer = part.slice(dataStart);
        }
      }

      // Parse form fields
      if (partStr.includes('name="language"')) {
        const match = partStr.match(/\r\n\r\n([^\r\n]+)/);
        if (match) options.language = match[1].trim();
      }

      if (partStr.includes('name="format"')) {
        const match = partStr.match(/\r\n\r\n([^\r\n]+)/);
        if (match) options.format = match[1].trim();
      }
    }

    if (!fileBuffer || fileBuffer.length === 0) {
      throw new TranscriptionError('No file uploaded or file is empty', 'NO_FILE');
    }

    // Validate file size
    validateFileSize(fileBuffer.length);

    // Handle M4A files specifically
    if (fileType === 'audio/x-m4a' || fileType === 'audio/m4a') {
      fileType = 'audio/mp4'; // AssemblyAI expects audio/mp4 for M4A
    }

    console.log(`Processing ${fileType} file (${(fileBuffer.length / 1024 / 1024).toFixed(1)}MB) with AssemblyAI`);

    // Log file info for debugging
    console.log(`File info: type=${fileType}, size=${fileBuffer.length} bytes`);

    // Upload file to AssemblyAI
    const audioUrl = await uploadFileToAssemblyAI(fileBuffer, fileType);

    // Submit transcription request
    const transcriptId = await submitTranscriptionRequest(audioUrl, options);

    // Wait for completion
    const transcript = await pollTranscriptionStatus(transcriptId);

    // Format output
    const formatted = formatTranscript(transcript, options.format || 'txt');

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        text: formatted.text || formatted,
        transcript: transcript,
        service: 'assemblyai',
        processing_time: transcript.audio_duration || 0,
        confidence: transcript.confidence || 0.95
      })
    };

  } catch (error) {
    return createErrorResponse(error);
  }
};
