// Simple health check function to diagnose API key issues
export default async (req) => {
  try {
    if (req.method !== "GET") {
      return new Response(JSON.stringify({ error: "Use GET" }), { status: 405 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    
    // Check if API key exists
    if (!apiKey) {
      return new Response(JSON.stringify({ 
        status: "error",
        message: "OPENAI_API_KEY environment variable is not set",
        timestamp: new Date().toISOString()
      }), { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
    
    // Check API key format
    if (!apiKey.startsWith('sk-')) {
      return new Response(JSON.stringify({ 
        status: "error",
        message: "OPENAI_API_KEY has invalid format",
        details: "API key should start with 'sk-'",
        timestamp: new Date().toISOString()
      }), { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
    
    // Check API key length (basic validation)
    if (apiKey.length < 20) {
      return new Response(JSON.stringify({ 
        status: "error",
        message: "OPENAI_API_KEY appears too short",
        details: "Valid OpenAI API keys are typically 51+ characters long",
        timestamp: new Date().toISOString()
      }), { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
    
    return new Response(JSON.stringify({ 
      status: "healthy",
      message: "OPENAI_API_KEY is properly configured",
      timestamp: new Date().toISOString()
    }), { 
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
    
  } catch (err) {
    return new Response(JSON.stringify({ 
      status: "error",
      message: "Health check failed",
      details: err.message,
      timestamp: new Date().toISOString()
    }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};