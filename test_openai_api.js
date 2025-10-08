// Test script to verify OpenAI API key and Whisper endpoint
// This script can be run locally to test connectivity

import OpenAI from "openai";
import fs from "fs";

// You would need to set your API key in the environment or replace it here
const apiKey = process.env.OPENAI_API_KEY || "YOUR_API_KEY_HERE";

if (!apiKey || apiKey === "YOUR_API_KEY_HERE") {
  console.error("Please set OPENAI_API_KEY environment variable");
  process.exit(1);
}

if (!apiKey.startsWith('sk-')) {
  console.error("API key format appears invalid. Should start with 'sk-'");
  process.exit(1);
}

const openai = new OpenAI({ apiKey });

async function testAPIKey() {
  console.log("Testing OpenAI API key...");
  
  try {
    // Test models endpoint
    const models = await openai.models.list();
    console.log("✓ API key is valid");
    console.log(`✓ Found ${models.data.length} models`);
    
    // Check if whisper-1 model exists
    const whisperModel = models.data.find(model => model.id === "whisper-1");
    if (whisperModel) {
      console.log("✓ whisper-1 model is available");
    } else {
      console.log("✗ whisper-1 model not found");
    }
    
    return true;
  } catch (error) {
    console.error("✗ API key test failed:", error.message);
    return false;
  }
}

async function testTranscription() {
  console.log("\nTesting Whisper transcription...");
  
  // Check if test audio file exists
  const testFile = "test_audio.mp3";
  if (!fs.existsSync(testFile)) {
    console.log("No test audio file found. Skipping transcription test.");
    return false;
  }
  
  try {
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(testFile),
      model: "whisper-1",
      response_format: "verbose_json"
    });
    
    console.log("✓ Transcription successful");
    console.log(`✓ Transcript length: ${transcription.text.length} characters`);
    console.log(`✓ Segments count: ${transcription.segments?.length || 0}`);
    
    return true;
  } catch (error) {
    console.error("✗ Transcription test failed:", error.message);
    return false;
  }
}

async function main() {
  console.log("=== OpenAI Whisper API Diagnostic Tool ===\n");
  
  const apiKeyValid = await testAPIKey();
  if (!apiKeyValid) {
    console.log("\nFix API key configuration before proceeding.");
    process.exit(1);
  }
  
  await testTranscription();
  
  console.log("\n=== Diagnostic Complete ===");
}

main();