const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const FormData = require('form-data');

class WhisperService {
  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY;
    this.baseUrl = 'https://api.openai.com/v1';
    
    if (!this.apiKey) {
      console.warn('OpenAI API key not configured');
    }
  }

  async transcribeUrl(fileUrl, fileType = 'audio/wav') {
    try {
      console.log('Starting Whisper transcription:', fileUrl);

      // Download file
      const fileResponse = await axios({
        method: 'get',
        url: fileUrl,
        responseType: 'stream'
      });

      // Create form data
      const form = new FormData();
      form.append('file', fileResponse.data, {
        filename: 'audio.' + fileType.split('/')[1],
        contentType: fileType
      });
      form.append('model', 'whisper-1');
      form.append('response_format', 'verbose_json');

      // Send to Whisper
      const response = await axios({
        method: 'post',
        url: `${this.baseUrl}/audio/transcriptions`,
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          ...form.getHeaders()
        },
        data: form
      });

      const data = response.data;

      return {
        text: data.text || '',
        confidence: this.calculateConfidence(data),
        duration: data.duration || 0,
        segments: data.segments || [],
        language: data.language || 'en',
        service: 'whisper',
        status: 'completed',
        raw: data
      };

    } catch (error) {
      console.error('Whisper transcription error:', error);
      throw new Error(`Whisper transcription failed: ${error.message}`);
    }
  }

  async transcribeFile(filePath, fileType = 'audio/wav') {
    try {
      console.log('Starting Whisper transcription from file:', filePath);

      // Read file
      const fileBuffer = await fs.readFile(filePath);
      
      // Create form data
      const form = new FormData();
      form.append('file', fileBuffer, {
        filename: path.basename(filePath),
        contentType: fileType
      });
      form.append('model', 'whisper-1');
      form.append('response_format', 'verbose_json');

      // Send to Whisper
      const response = await axios({
        method: 'post',
        url: `${this.baseUrl}/audio/transcriptions`,
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          ...form.getHeaders()
        },
        data: form
      });

      const data = response.data;

      return {
        text: data.text || '',
        confidence: this.calculateConfidence(data),
        duration: data.duration || 0,
        segments: data.segments || [],
        language: data.language || 'en',
        service: 'whisper',
        status: 'completed',
        raw: data
      };

    } catch (error) {
      console.error('Whisper file transcription error:', error);
      throw new Error(`Whisper file transcription failed: ${error.message}`);
    }
  }

  calculateConfidence(data) {
    if (!data.segments || data.segments.length === 0) {
      return 0.8; // Default confidence for simple transcriptions
    }

    // Calculate average confidence from segments
    const totalConfidence = data.segments.reduce((sum, segment) => {
      return sum + (segment.avg_logprob || 0);
    }, 0);

    const avgConfidence = Math.abs(totalConfidence / data.segments.length);
    
    // Convert logprob to percentage (rough approximation)
    return Math.min(Math.max(avgConfidence * 100, 0), 100);
  }

  async transcribeWithCustomPrompt(fileUrl, prompt) {
    try {
      console.log('Starting Whisper transcription with custom prompt:', fileUrl);

      // Download file
      const fileResponse = await axios({
        method: 'get',
        url: fileUrl,
        responseType: 'stream'
      });

      // Create form data
      const form = new FormData();
      form.append('file', fileResponse.data, {
        filename: 'audio.wav',
        contentType: 'audio/wav'
      });
      form.append('model', 'whisper-1');
      form.append('prompt', prompt);
      form.append('response_format', 'verbose_json');

      // Send to Whisper
      const response = await axios({
        method: 'post',
        url: `${this.baseUrl}/audio/transcriptions`,
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          ...form.getHeaders()
        },
        data: form
      });

      const data = response.data;

      return {
        text: data.text || '',
        confidence: this.calculateConfidence(data),
        duration: data.duration || 0,
        segments: data.segments || [],
        language: data.language || 'en',
        service: 'whisper',
        status: 'completed',
        prompt: prompt,
        raw: data
      };

    } catch (error) {
      console.error('Whisper custom prompt transcription error:', error);
      throw new Error(`Whisper custom prompt transcription failed: ${error.message}`);
    }
  }
}

module.exports = new WhisperService();