// Test transcription function with minimal implementation
export default async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Use POST" }), { status: 405 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      // Log to console for debugging
      console.error("OPENAI_API_KEY environment variable is not set");
      return new Response(JSON.stringify({ error: "Missing OPENAI_API_KEY" }), { status: 500 });
    }

    // Log request details for debugging
    console.log("Transcribe request received");
    console.log("Content-Type:", req.headers.get("content-type"));
    
    // Forward request to OpenAI
    const openaiRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": req.headers.get("content-type") || "application/json",
      },
      body: req.body,
    });

    // Log response details for debugging
    console.log("OpenAI response status:", openaiRes.status);
    
    // Forward response
    const ct = openaiRes.headers.get("content-type") || "application/json";
    const body = await openaiRes.text();
    
    // Try to parse response for better error handling
    let responseBody;
    try {
      responseBody = JSON.parse(body);
    } catch (parseError) {
      // If not JSON, return as text
      responseBody = body;
    }
    
    if (!openaiRes.ok) {
      console.error("OpenAI API error:", responseBody);
    }
    
    return new Response(JSON.stringify(responseBody), { 
      status: openaiRes.status, 
      headers: { "content-type": ct } 
    });

  } catch (err) {
    console.error("Function error:", err);
    return new Response(JSON.stringify({ 
      error: "Server error",
      message: err.message,
      stack: err.stack
    }), { status: 500 });
  }
};