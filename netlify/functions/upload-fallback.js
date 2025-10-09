const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');

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

// Max file size: 10MB (reduced for Netlify functions)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Simple local storage (in production, use proper cloud storage)
const LOCAL_STORAGE_DIR = '/tmp/transcription-uploads';

// Ensure storage directory exists
async function ensureStorageDir() {
  try {
    await fs.mkdir(LOCAL_STORAGE_DIR, { recursive: true });
  } catch (error) {
    // Directory might already exist
  }
}

// Generate public URL for local file
function generatePublicUrl(fileName) {
  // In production, this would be your actual domain
  return `https://your-domain.netlify.app/.netlify/functions/serve-file/${fileName}`;
}

exports.handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return handleOptions();
  }

  try {
    console.log('Fallback upload request received');

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

    // Ensure storage directory exists
    await ensureStorageDir();

    // Generate unique filename
    const timestamp = Date.now();
    const safeFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const finalFileName = `${timestamp}_${uuidv4()}_${safeFileName}`;
    const filePath = path.join(LOCAL_STORAGE_DIR, finalFileName);
    
    // Save file locally
    await fs.writeFile(filePath, fileBuffer);

    // Generate public URL (in production, this would serve the file)
    const fileUrl = generatePublicUrl(finalFileName);

    console.log('File saved successfully:', finalFileName);
    console.log('File size:', fileBuffer.length, 'bytes');
    console.log('Public URL:', fileUrl);

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        fileName: finalFileName,
        fileUrl: fileUrl,
        fileSize: fileBuffer.length,
        fileType,
        uploadedAt: new Date().toISOString(),
        note: 'File uploaded to temporary storage. In production, configure cloud storage.',
        nextSteps: [
          'Configure cloud storage (AWS S3, Google Cloud, etc.)',
          'Set up proper file serving endpoint',
          'Configure environment variables for production storage'
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
        details: error.message,
        suggestion: 'Check server logs and ensure temporary directory is writable'
      })
    };
  }
};

// Helper function to serve uploaded files (optional)
exports.serveFile = async (event, context) => {
  try {
    const fileName = event.path.split('/').pop();
    const filePath = path.join(LOCAL_STORAGE_DIR, fileName);
    
    // Security check - ensure file is in our directory
    if (!filePath.startsWith(LOCAL_STORAGE_DIR)) {
      return {
        statusCode: 403,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Access denied' })
      };
    }

    const fileBuffer = await fs.readFile(filePath);
    const stat = await fs.stat(filePath);
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Length': stat.size,
        'Content-Disposition': `attachment; filename="${fileName}"`
      },
      body: fileBuffer.toString('base64'),
      isBase64Encoded: true
    };

  } catch (error) {
    console.error('Serve file error:', error);
    return {
      statusCode: 404,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'File not found' })
    };
  }
};