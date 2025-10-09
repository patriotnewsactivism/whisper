const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs').promises;

// Import all transcription services
const whisperService = require('../../server/services/whisper-service');
const assemblyaiService = require('../../server/services/assemblyai-service');
const elevateaiService = require('../../server/services/elevateai-service');
const youtubeService = require('../../server/services/youtube-service');

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Handle CORS preflight
const handleOptions = () => ({
  statusCode: 200,
  headers: corsHeaders,
  body: '',
});

// Main handler
exports.handler = async (event, context) => {
  console.log('Transcription request received:', {
    method: event.httpMethod,
    path: event.path,
    headers: event.headers,
    queryStringParameters: event.queryStringParameters
  });

  if (event.httpMethod === 'OPTIONS') {
    return handleOptions();
  }

  try {
    const { service, url, fileType, customPrompt } = JSON.parse(event.body || '{}');
    
    if (!service) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Service parameter is required' })
      };
    }

    console.log('Processing transcription request:', { service, hasUrl: !!url, fileType, customPrompt });

    let result;

    switch (service.toLowerCase()) {
      case 'whisper':
        result = await handleWhisperTranscription(event);
        break;
      case 'assemblyai':
        result = await handleAssemblyAITranscription(event);
        break;
      case 'elevateai':
        result = await handleElevateAITranscription(event);
        break;
      case 'youtube':
        result = await handleYouTubeTranscription(event);
        break;
      default:
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ error: `Unsupported service: ${service}` })
        };
    }

    console.log('Transcription completed:', { service, success: !!result });

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        service,
        result,
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('Transcription error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: 'Internal server error',
        details: error.message
      })
    };
  }
};

// Handle Whisper transcription
async function handleWhisperTranscription(event) {
  const { fileUrl, fileType } = JSON.parse(event.body || '{}');
  
  if (!fileUrl) {
    throw new Error('fileUrl is required for Whisper transcription');
  }

  const result = await whisperService.transcribeUrl(fileUrl, fileType);
  return result;
}

// Handle AssemblyAI transcription
async function handleAssemblyAITranscription(event) {
  const { fileUrl, fileType } = JSON.parse(event.body || '{}');
  
  if (!fileUrl) {
    throw new Error('fileUrl is required for AssemblyAI transcription');
  }

  const result = await assemblyaiService.transcribeUrl(fileUrl, fileType);
  return result;
}

// Handle ElevateAI transcription
async function handleElevateAITranscription(event) {
  const { fileUrl, fileType } = JSON.parse(event.body || '{}');
  
  if (!fileUrl) {
    throw new Error('fileUrl is required for ElevateAI transcription');
  }

  const result = await elevateaiService.transcribeUrl(fileUrl, fileType);
  return result;
}

// Handle YouTube transcription
async function handleYouTubeTranscription(event) {
  const { url } = JSON.parse(event.body || '{}');
  
  if (!url) {
    throw new Error('url is required for YouTube transcription');
  }

  const result = await youtubeService.getTranscript(url);
  return result;
}