const fs = require('fs').promises;
const path = require('path');

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

// Handle CORS preflight
const handleOptions = () => ({
  statusCode: 200,
  headers: corsHeaders,
  body: '',
});

// Allowed file types
const ALLOWED_MIME_TYPES = [
  'audio/mpeg',
  'audio/wav',
  'audio/mp4',
  'audio/webm',
  'audio/ogg',
  'audio/flac',
  'video/mp4',
  'video/webm',
  'video/ogg',
];

// Max file size: 5MB for simple upload
const MAX_FILE_SIZE = 5 * 1024 * 1024;

exports.handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return handleOptions();
  }

  try {
    console.log('Simple upload request received');

    const body = JSON.parse(event.body || '{}');
    const { file, fileName, fileType } = body;

    if (!file || !fileName) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: 'Missing required fields: file and fileName are required' 
        })
      };
    }

    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(fileType)) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: 'Unsupported file type',
          allowedTypes: ALLOWED_MIME_TYPES 
        })
      };
    }

    // Decode base64 file
    const fileBuffer = Buffer.from(file, 'base64');
    
    // Validate file size
    if (fileBuffer.length > MAX_FILE_SIZE) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: 'File too large',
          maxSize: MAX_FILE_SIZE,
          actualSize: fileBuffer.length
        })
      };
    }

    // For simple testing, we'll return a mock successful upload
    // In production, you would save to cloud storage
    console.log('File received successfully:', fileName);
    console.log('File size:', fileBuffer.length, 'bytes');
    console.log('File type:', fileType);

    // Return mock success response for testing
    const mockFileUrl = `https://example.com/uploads/${Date.now()}_${fileName}`;

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        fileName: fileName,
        fileUrl: mockFileUrl,
        fileSize: fileBuffer.length,
        fileType: fileType,
        uploadedAt: new Date().toISOString(),
        note: 'This is a mock upload for testing. Configure cloud storage for production.',
        nextSteps: [
          'Configure cloud storage (AWS S3, Google Cloud Storage, etc.)',
          'Set up proper file serving endpoint',
          'Configure environment variables for storage credentials'
        ]
      })
    };

  } catch (error) {
    console.error('Upload error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: 'Upload failed',
        details: error.message
      })
    };
  }
};