// server.js
import express from "express";
import multer from "multer";
import fs from "fs";
import OpenAI from "openai";

const app = express();
const upload = multer({ dest: "uploads/" });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.use(express.static("client/dist"));

// Enhanced transcribe endpoint with proper error handling
app.post("/api/transcribe", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Validate file type
    const allowedTypes = ['audio/', 'video/'];
    const isAllowedType = allowedTypes.some(type => req.file.mimetype.startsWith(type));
    
    if (!isAllowedType) {
      // Clean up uploaded file
      try {
        fs.unlinkSync(req.file.path);
      } catch (err) {
        console.error("Failed to delete uploaded file:", err.message);
      }
      return res.status(400).json({ error: "Invalid file type. Please upload an audio or video file." });
    }

    // Prepare transcription options
    const transcriptionOptions = {
      file: fs.createReadStream(req.file.path),
      model: "whisper-1",
      response_format: "verbose_json",
    };

    // Add language parameter if provided
    if (req.body.language) {
      transcriptionOptions.language = req.body.language;
    }

    // Add temperature parameter if provided
    if (req.body.temperature) {
      transcriptionOptions.temperature = parseFloat(req.body.temperature);
    }

    // Add prompt parameter if provided
    if (req.body.prompt) {
      transcriptionOptions.prompt = req.body.prompt;
    }

    // Retry mechanism
    let lastError;
    const maxRetries = 3;
    const retryDelay = 1000; // 1 second

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const transcript = await openai.audio.transcriptions.create(transcriptionOptions);
        return res.json(transcript);
      } catch (err) {
        lastError = err;
        console.error(`Transcription attempt ${attempt} failed:`, err.message);
        
        // If it's the last attempt, don't wait
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
        }
      }
    }

    // If all retries failed
    return res.status(500).json({ error: `Transcription failed after ${maxRetries} attempts: ${lastError.message}` });
  } catch (err) {
    console.error("Server error:", err);
    return res.status(500).json({ error: err.message });
  } finally {
    // Clean up uploaded file
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (err) {
        console.error("Failed to delete uploaded file:", err.message);
      }
    }
  }
});

app.listen(5000, () => console.log("Server running on port 5000"));