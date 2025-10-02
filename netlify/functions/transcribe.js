// Robust Netlify Function for OpenAI Whisper Transcription
// With enhanced error handling, logging, and request validation

const { createReadStream } = require('fs');
const fetch = require('node-fetch');
const FormData = require('form-data');
const multer = require('multer');
const util = require('util');
const stream = require('stream');
const pipeline = util.promisify(stream.pipeline);

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit (OpenAI's max)
  fileFilter: (req, file, cb) => {
    // Accept audio and video files
    if (file.mimetype.startsWith('audio/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio and video files are allowed'));
    }
  }
});

// Promisify multer middleware
const multerPromise = (req) => {
  return new Promise((resolve, reject) => {
    const multerInstance = upload.single('file');
    
    multerInstance(req, {}, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve(req);
      }
    });
  });
};

// Helper for detailed logging
const logWithTimestamp = (message, data = null) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
};

// Main handler function
exports.handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed. Use POST.' })
    };
  }

  try {
    logWithTimestamp('Transcription request received');

    // Validate API key
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || apiKey.trim() === '' || !apiKey.startsWith('sk-')) {
      logWithTimestamp('Invalid API key format');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'API key configuration error',
          details: 'The API key is missing or has an invalid format'
        })
      };
    }

    // Parse the incoming request
    let parsedBody;
    try {
      // For multipart form data, we need to handle it differently
      if (event.headers['content-type'] && 
          event.headers['content-type'].includes('multipart/form-data')) {
        
        // Process the multipart form data
        const req = {
          headers: event.headers,
          body: event.body,
          isBase64Encoded: event.isBase64Encoded
        };
        
        await multerPromise(req);
        
        // At this point, req.file should contain the uploaded file
        if (!req.file) {
          throw new Error('No file uploaded');
        }
        
        parsedBody = {
          file: req.file,
          model: req.body.model || 'whisper-1',
          language: req.body.language,
          response_format: req.body.response_format || 'verbose_json',
          prompt: req.body.prompt
        };
      } else {
        // For JSON requests (unlikely for file uploads but handling anyway)
        parsedBody = JSON.parse(event.body);
      }
      
      logWithTimestamp('Request parsed successfully', {
        model: parsedBody.model,
        language: parsedBody.language,
        hasFile: !!parsedBody.file
      });
    } catch (err) {
      logWithTimestamp('Error parsing request', { error: err.message });
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Invalid request format',
          details: err.message
        })
      };
    }

    // Validate required fields
    if (!parsedBody.file) {
      logWithTimestamp('Missing file in request');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Missing required field',
          details: 'No file provided for transcription'
        })
      };
    }

    // Prepare the request to OpenAI
    const formData = new FormData();
    
    // Add the file
    formData.append('file', 
      createReadStream(parsedBody.file.path), 
      {
        filename: parsedBody.file.originalname || 'audio.mp3',
        contentType: parsedBody.file.mimetype
      }
    );
    
    // Add other parameters
    formData.append('model', parsedBody.model || 'whisper-1');
    
    if (parsedBody.language) {
      formData.append('language', parsedBody.language);
    }
    
    formData.append('response_format', parsedBody.response_format || 'verbose_json');
    
    if (parsedBody.prompt) {
      formData.append('prompt', parsedBody.prompt);
    }

    logWithTimestamp('Sending request to OpenAI API');
    
    // Send request to OpenAI
    const openaiResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        ...formData.getHeaders()
      },
      body: formData
    });

    // Process the response
    const responseText = await openaiResponse.text();
    let responseData;
    
    try {
      responseData = JSON.parse(responseText);
      logWithTimestamp('Received response from OpenAI API', {
        status: openaiResponse.status,
        hasText: !!responseData.text,
        hasSegments: !!(responseData.segments && responseData.segments.length)
      });
    } catch (err) {
      logWithTimestamp('Error parsing OpenAI response', { 
        status: openaiResponse.status,
        responseText: responseText.substring(0, 500) + (responseText.length > 500 ? '...' : '')
      });
      
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Error parsing OpenAI response',
          details: err.message,
          response: responseText.substring(0, 1000) + (responseText.length > 1000 ? '...' : '')
        })
      };
    }

    // Check for OpenAI API errors
    if (!openaiResponse.ok) {
      logWithTimestamp('OpenAI API error', responseData);
      return {
        statusCode: openaiResponse.status,
        headers,
        body: JSON.stringify({ 
          error: 'OpenAI API error',
          details: responseData.error || 'Unknown error from OpenAI API'
        })
      };
    }

    // Return the successful response
    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(responseData)
    };
    
  } catch (err) {
    logWithTimestamp('Unhandled error', { error: err.message, stack: err.stack });
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Server error',
        details: err.message
      })
    };
  }
};