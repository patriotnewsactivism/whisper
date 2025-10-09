const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs').promises;

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

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

// Max file size: 100MB
const MAX_FILE_SIZE = 100 * 1024 * 1024;

exports.handler = async (event, context) => {
  console.log('Upload request received:', {
    method: event.httpMethod,
    path: event.path,
    headers: event.headers,
    queryStringParameters: event.queryStringParameters
  });

  if (event.httpMethod === 'OPTIONS') {
    return handleOptions();
  }

  try {
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

    // Generate unique filename
    const timestamp = Date.now();
    const safeFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const finalFileName = `${timestamp}_${safeFileName}`;
    
    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('uploads')
      .upload(finalFileName, fileBuffer, {
        contentType: fileType,
        upsert: false,
      });

    if (error) {
      console.error('Supabase upload error:', error);
      throw error;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('uploads')
      .getPublicUrl(finalFileName);

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        fileName: finalFileName,
        fileUrl: urlData.publicUrl,
        fileSize: fileBuffer.length,
        fileType,
        uploadedAt: new Date().toISOString()
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