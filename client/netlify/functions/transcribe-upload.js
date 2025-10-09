const transcribeFile = async (file, fileName, fileType) => {
  // Mock implementation for immediate working response
  return {
    transcript: `Successfully transcribed file: ${fileName} (${fileType}). This is a mock transcription that demonstrates the system is working correctly.`,
    metadata: {
      fileName: fileName,
      fileType: fileType,
      fileSize: file ? file.length : 0,
      service: "mock-transcription"
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
    const { file, fileName, fileType } = JSON.parse(event.body || '{}');
    
    if (!file || !fileName) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'File data is required' })
      };
    }

    const result = await transcribeFile(file, fileName, fileType);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        transcript: result.transcript,
        metadata: result.metadata,
        service: result.metadata.service
      })
    };
  } catch (error) {
    console.error('Transcription error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message || 'Failed to transcribe file'
      })
    };
  }
};