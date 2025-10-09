const transcribeYouTube = async (url) => {
  // Mock implementation for immediate working response
  return {
    transcript: "This is a working mock transcription of the YouTube video. The URL provided was: " + url,
    metadata: {
      title: "Sample YouTube Video",
      duration: "3:45",
      channel: "Sample Channel",
      url: url,
      language: "en"
    }
  };
};

exports.handler = async (event, context) => {
  // Set headers for all responses
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Handle OPTIONS request for CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { url } = JSON.parse(event.body || '{}');
    
    if (!url) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'YouTube URL is required' })
      };
    }

    const result = await transcribeYouTube(url);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        transcript: result.transcript,
        metadata: result.metadata,
        service: 'youtube'
      })
    };
  } catch (error) {
    console.error('Transcription error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message || 'Failed to transcribe YouTube video'
      })
    };
  }
};