// Netlify Function: /api/transcribe
// Safe: your OPENAI_API_KEY stays on the server side (env var)

export const config = {
  path: "/api/transcribe", // pretty URL
}

export default async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Use POST" }), { status: 405 })
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Missing OPENAI_API_KEY" }), { status: 500 })
    }

    // Netlify gives you the raw request. We stream it straight to OpenAI.
    // IMPORTANT: we keep the same Content-Type (multipart/form-data; boundary=...)
    const contentType = req.headers.get("content-type") || ""

    const openaiRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": contentType,
      },
      // req.body is a ReadableStream in Next-Gen functions; passthrough is fine.
      body: req.body,
    })

    // Forward OpenAI response as-is (usually JSON: { text: "..." })
    const ct = openaiRes.headers.get("content-type") || "application/json"
    const body = await openaiRes.text()
    return new Response(body, { status: openaiRes.status, headers: { "content-type": ct } })

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
}