// Health check endpoint for Whisper Transcriber
// This function checks the OpenAI API connectivity and configuration

const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed. Use GET.' })
    };
  }

  try {
    // Check for API key
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          status: 'error',
          message: 'OpenAI API key is not configured',
          details: {
            apiKeyConfigured: false,
            apiConnectivity: 'unknown'
          }
        })
      };
    }
    
    // Validate API key format
    if (!apiKey.startsWith('sk-')) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          status: 'error',
          message: 'OpenAI API key has invalid format',
          details: {
            apiKeyConfigured: true,
            apiKeyFormat: 'invalid',
            apiConnectivity: 'unknown'
          }
        })
      };
    }
    
    // Test API connectivity with a simple models list request
    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Check if whisper-1 model is available
        const hasWhisperModel = data.data && data.data.some(model => model.id === 'whisper-1');
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            status: 'healthy',
            message: 'OpenAI API is accessible',
            details: {
              apiKeyConfigured: true,
              apiKeyFormat: 'valid',
              apiConnectivity: 'connected',
              whisperModelAvailable: hasWhisperModel,
              modelsCount: data.data ? data.data.length : 0
            }
          })
        };
      } else {
        const errorData = await response.json();
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            status: 'error',
            message: 'OpenAI API returned an error',
            details: {
              apiKeyConfigured: true,
              apiKeyFormat: 'valid',
              apiConnectivity: 'error',
              statusCode: response.status,
              error: errorData.error || 'Unknown API error'
            }
          })
        };
      }
    } catch (apiError) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          status: 'error',
          message: 'Failed to connect to OpenAI API',
          details: {
            apiKeyConfigured: true,
            apiKeyFormat: 'valid',
            apiConnectivity: 'failed',
            error: apiError.message
          }
        })
      };
    }
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        status: 'error',
        message: 'Health check failed',
        details: {
          error: err.message
        }
      })
    };
  }
};