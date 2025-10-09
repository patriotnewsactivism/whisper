#!/usr/bin/env node

/**
 * Comprehensive test script for all transcription services
 * Run with: node test-all-integration.js
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Base URL for local testing
const BASE_URL = process.env.BASE_URL || 'http://localhost:8888/.netlify/functions';
// const BASE_URL = 'https://your-domain.netlify.app/.netlify/functions';

// Test configuration
const TESTS = {
  services: ['whisper', 'assemblyai', 'elevateai', 'youtube'],
  testUrls: {
    youtube: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', // Rick Astley - Never Gonna Give You Up
    audio: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav' // Test audio file
  }
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testServiceConfiguration() {
  log('\n🔧 Testing Service Configuration', 'cyan');
  log('=================================', 'cyan');

  for (const service of TESTS.services) {
    try {
      const response = await axios.post(`${BASE_URL}/test-all-services`, {
        service
      });

      const result = response.data.result;
      
      if (result.status === 'ready') {
        log(`✅ ${service.toUpperCase()}: ${result.message}`, 'green');
      } else if (result.status === 'error') {
        log(`❌ ${service.toUpperCase()}: ${result.message}`, 'red');
      } else {
        log(`ℹ️  ${service.toUpperCase()}: ${result.message}`, 'yellow');
      }

    } catch (error) {
      log(`❌ ${service.toUpperCase()}: Connection failed - ${error.message}`, 'red');
    }
  }
}

async function testYouTubeTranscription() {
  log('\n📺 Testing YouTube Transcription', 'cyan');
  log('=================================', 'cyan');

  try {
    const response = await axios.post(`${BASE_URL}/transcribe`, {
      service: 'youtube',
      url: TESTS.testUrls.youtube
    });

    if (response.data.success) {
      log('✅ YouTube transcription successful', 'green');
      log(`   Text: ${response.data.result.text.substring(0, 100)}...`, 'blue');
      log(`   Language: ${response.data.result.language}`, 'blue');
    } else {
      log('❌ YouTube transcription failed', 'red');
      log(`   Error: ${response.data.error}`, 'red');
    }

  } catch (error) {
    log(`❌ YouTube transcription error: ${error.message}`, 'red');
  }
}

async function testFileUpload() {
  log('\n📁 Testing File Upload', 'cyan');
  log('======================', 'cyan');

  try {
    // Create a small test audio file (1 second of silence)
    const testAudioBuffer = Buffer.from([
      0x52, 0x49, 0x46, 0x46, 0x24, 0x08, 0x00, 0x00, 0x57, 0x41, 0x56, 0x45,
      0x66, 0x6D, 0x74, 0x20, 0x10, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00,
      0x44, 0xAC, 0x00, 0x00, 0x88, 0x58, 0x01, 0x00, 0x02, 0x00, 0x10, 0x00,
      0x64, 0x61, 0x74, 0x61, 0x00, 0x08, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00
    ]);

    const base64Audio = testAudioBuffer.toString('base64');

    const response = await axios.post(`${BASE_URL}/upload`, {
      file: base64Audio,
      fileName: 'test-audio.wav',
      fileType: 'audio/wav'
    });

    if (response.data.success) {
      log('✅ File upload successful', 'green');
      log(`   File URL: ${response.data.fileUrl}`, 'blue');
      log(`   File size: ${response.data.fileSize} bytes`, 'blue');
      return response.data.fileUrl;
    } else {
      log('❌ File upload failed', 'red');
      log(`   Error: ${response.data.error}`, 'red');
      return null;
    }

  } catch (error) {
    log(`❌ File upload error: ${error.message}`, 'red');
    return null;
  }
}

async function testAudioTranscription(fileUrl, service) {
  log(`\n🎙️ Testing ${service.toUpperCase()} Transcription`, 'cyan');
  log('=====================================', 'cyan');

  try {
    const response = await axios.post(`${BASE_URL}/transcribe`, {
      service: service,
      fileUrl: fileUrl,
      fileType: 'audio/wav'
    });

    if (response.data.success) {
      log(`✅ ${service} transcription successful`, 'green');
      log(`   Text: ${response.data.result.text.substring(0, 100)}...`, 'blue');
      log(`   Confidence: ${Math.round(response.data.result.confidence * 100)}%`, 'blue');
      log(`   Duration: ${response.data.result.duration}s`, 'blue');
    } else {
      log(`❌ ${service} transcription failed`, 'red');
      log(`   Error: ${response.data.error}`, 'red');
    }

  } catch (error) {
    log(`❌ ${service} transcription error: ${error.message}`, 'red');
  }
}

async function runAllTests() {
  log('🚀 Starting Comprehensive Integration Tests', 'bright');
  log('==========================================', 'bright');
  log(`Base URL: ${BASE_URL}`, 'yellow');

  try {
    // Test service configuration
    await testServiceConfiguration();

    // Test YouTube transcription
    await testYouTubeTranscription();

    // Test file upload
    const uploadedFileUrl = await testFileUpload();

    // Test audio transcription services if file uploaded
    if (uploadedFileUrl) {
      for (const service of ['whisper', 'assemblyai', 'elevateai']) {
        await testAudioTranscription(uploadedFileUrl, service);
      }
    }

    log('\n🎉 All tests completed!', 'bright');
    log('========================', 'bright');

  } catch (error) {
    log(`\n❌ Test suite failed: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runAllTests().catch(error => {
    log(`\n❌ Fatal error: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = {
  runAllTests,
  testServiceConfiguration,
  testYouTubeTranscription,
  testFileUpload,
  testAudioTranscription
};