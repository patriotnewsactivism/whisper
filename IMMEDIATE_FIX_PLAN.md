# Immediate Fix Plan for Whisper Transcriber

## Current Problem
The application is returning a 500 error when trying to transcribe files. This indicates a server-side issue with the Netlify function.

## Steps to Fix

### 1. Verify Environment Variables
First, we need to confirm that the OpenAI API key is properly configured:
- Go to Netlify dashboard
- Navigate to your site settings
- Go to "Environment variables" section
- Confirm `OPENAI_API_KEY` is set with a valid key starting with `sk-`

### 2. Deploy the Robust Implementation
I've created a more robust implementation in PR #7. To deploy it:

1. Merge the pull request #7:
   ```bash
   gh pr merge 7 --merge
   ```

2. Or manually replace the files:
   ```bash
   cd whisper
   # Replace the edge function with the robust function
   mv netlify/functions/transcribe-robust.js netlify/functions/transcribe.js
   
   # Update Netlify configuration
   echo '[build]
  command = "npm run build"
  publish = "client/dist"

[functions]
  node_bundler = "esbuild"' > netlify.toml
   
   # Commit and push changes
   git add netlify/functions/transcribe.js netlify.toml
   git commit -m "Replace edge function with robust implementation"
   git push origin main
   ```

### 3. Alternative: Switch to AssemblyAI
If OpenAI continues to cause issues, we can switch to AssemblyAI which has a more reliable free tier:

1. Sign up for AssemblyAI (free account)
2. Get API key from dashboard
3. Set `ASSEMBLYAI_API_KEY` environment variable in Netlify
4. Replace the transcribe function with AssemblyAI implementation:

```javascript
// AssemblyAI implementation
export default async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Use POST" }), { status: 405 });
    }

    const apiKey = process.env.ASSEMBLYAI_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Missing ASSEMBLYAI_API_KEY" }), { status: 500 });
    }

    // For AssemblyAI, we need to upload the file first
    // Then start transcription with the file URL
    
    // 1. Upload file to AssemblyAI
    const uploadResponse = await fetch("https://api.assemblyai.com/v2/upload", {
      method: "POST",
      headers: {
        "Authorization": apiKey,
        "Content-Type": req.headers.get("content-type") || ""
      },
      body: req.body
    });

    if (!uploadResponse.ok) {
      const error = await uploadResponse.json();
      return new Response(JSON.stringify({ 
        error: "File upload failed", 
        details: error.error || "Unknown upload error" 
      }), { status: 500 });
    }

    const uploadData = await uploadResponse.json();
    const audioUrl = uploadData.upload_url;

    // 2. Start transcription
    const transcribeResponse = await fetch("https://api.assemblyai.com/v2/transcript", {
      method: "POST",
      headers: {
        "Authorization": apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        audio_url: audioUrl,
        format_text: true,
        punctuate: true
      })
    });

    if (!transcribeResponse.ok) {
      const error = await transcribeResponse.json();
      return new Response(JSON.stringify({ 
        error: "Transcription start failed", 
        details: error.error || "Unknown transcription error" 
      }), { status: 500 });
    }

    const transcribeData = await transcribeResponse.json();
    const transcriptId = transcribeData.id;

    // 3. Poll for completion (in a real implementation, this would be done asynchronously)
    // For now, we'll just return the transcript ID and let the client poll
    return new Response(JSON.stringify({
      id: transcriptId,
      status: "queued",
      message: "Transcription started. Poll /api/transcript/{id} for results."
    }), { 
      status: 202, // Accepted
      headers: { "Content-Type": "application/json" }
    });

  } catch (err) {
    return new Response(JSON.stringify({ 
      error: "Server error", 
      details: err.message 
    }), { status: 500 });
  }
}
```

## Verification Steps

1. After deploying, test with a small audio file
2. Check Netlify function logs for any error messages
3. Verify that the health check endpoint works: `/api/health`
4. If using AssemblyAI, test the upload and transcription endpoints separately

## Recommendation

1. First, check and fix the environment variables
2. Then deploy the robust implementation I've created
3. If issues persist, switch to AssemblyAI which is known to be more reliable for this use case