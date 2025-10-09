const whisperService = require('../../server/services/whisper-service');
const assemblyaiService = require('../../server/services/assemblyai-service');
const elevateaiService = require('../../server/services/elevateai-service');
const youtubeService = require('../../server/services/youtube-service');

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

exports.handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: '',
    };
  }

  try {
    const { service, url } = JSON.parse(event.body || '{}');
    
    let result = {
      status: 'error',
      message: 'Service not specified or invalid'
    };

    switch (service?.toLowerCase()) {
      case 'whisper':
        if (!process.env.OPENAI_API_KEY) {
          result = { status: 'error', message: 'OpenAI API key not configured' };
        } else {
          result = { status: 'ready', message: 'Whisper service configured' };
        }
        break;

      case 'assemblyai':
        if (!process.env.ASSEMBLYAI_API_KEY) {
          result = { status: 'error', message: 'AssemblyAI API key not configured' };
        } else {
          result = { status: 'ready', message: 'AssemblyAI service configured' };
        }
        break;

      case 'elevateai':
        if (!process.env.ELEVATEAI_API_KEY) {
          result = { status: 'error', message: 'ElevateAI API key not configured' };
        } else {
          result = { status: 'ready', message: 'ElevateAI service configured' };
        }
        break;

      case 'youtube':
        if (!process.env.YOUTUBE_API_KEY) {
          result = { status: 'error', message: 'YouTube API key not configured' };
        } else {
          result = { status: 'ready', message: 'YouTube service configured' };
        }
        break;

      default:
        result = {
          status: 'info',
          message: 'All services status',
          services: {
            whisper: { configured: !!process.env.OPENAI_API_KEY },
            assemblyai: { configured: !!process.env.ASSEMBLYAI_API_KEY },
            elevateai: { configured: !!process.env.ELEVATEAI_API_KEY },
            youtube: { configured: !!process.env.YOUTUBE_API_KEY }
          }
        };
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        result,
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('Test error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: 'Test failed',
        details: error.message
      })
    };
  }
};