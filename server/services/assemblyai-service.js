const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

class AssemblyAIService {
  constructor() {
    this.apiKey = process.env.ASSEMBLYAI_API_KEY;
    this.baseUrl = 'https://api.assemblyai.com/v2';
    
    if (!this.apiKey) {
      console.warn('AssemblyAI API key not configured');
    }
  }

  async transcribeUrl(fileUrl, fileType = 'audio/wav') {
    try {
      console.log('Starting AssemblyAI transcription:', fileUrl);

      // Step 1: Upload file
      const uploadUrl = await this.uploadFile(fileUrl);
      console.log('File uploaded to AssemblyAI:', uploadUrl);

      // Step 2: Create transcription
      const transcriptionId = await this.createTranscription(uploadUrl);
      console.log('Transcription created:', transcriptionId);

      // Step 3: Wait for completion
      const result = await this.waitForCompletion(transcriptionId);
      console.log('AssemblyAI transcription completed:', result.status);

      return {
        text: result.text || '',
        confidence: result.confidence || 0,
        duration: result.audio_duration || 0,
        words: result.words || [],
        language: result.language_code || 'en',
        service: 'assemblyai',
        status: 'completed'
      };

    } catch (error) {
      console.error('AssemblyAI transcription error:', error);
      throw new Error(`AssemblyAI transcription failed: ${error.message}`);
    }
  }

  async uploadFile(fileUrl) {
    try {
      // Download file
      const response = await axios({
        method: 'get',
        url: fileUrl,
        responseType: 'arraybuffer'
      });

      // Upload to AssemblyAI
      const uploadResponse = await axios({
        method: 'post',
        url: `${this.baseUrl}/upload`,
        headers: {
          'authorization': this.apiKey,
          'content-type': 'application/octet-stream',
        },
        data: response.data
      });

      return uploadResponse.data.upload_url;
    } catch (error) {
      console.error('AssemblyAI upload error:', error);
      throw error;
    }
  }

  async createTranscription(audioUrl, options = {}) {
    try {
      const response = await axios({
        method: 'post',
        url: `${this.baseUrl}/transcript`,
        headers: {
          'authorization': this.apiKey,
          'content-type': 'application/json',
        },
        data: {
          audio_url: audioUrl,
          language_code: options.language || 'en',
          punctuate: true,
          format_text: true,
          speaker_labels: options.speakerLabels || false,
          ...options
        }
      });

      return response.data.id;
    } catch (error) {
      console.error('AssemblyAI transcription creation error:', error);
      throw error;
    }
  }

  async waitForCompletion(transcriptionId, maxWaitTime = 300000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
      try {
        const response = await axios({
          method: 'get',
          url: `${this.baseUrl}/transcript/${transcriptionId}`,
          headers: {
            'authorization': this.apiKey,
          }
        });

        const data = response.data;
        
        if (data.status === 'completed') {
          return data;
        }
        
        if (data.status === 'error') {
          throw new Error(data.error || 'Transcription failed');
        }

        // Wait 3 seconds before checking again
        await new Promise(resolve => setTimeout(resolve, 3000));
        
      } catch (error) {
        console.error('Error checking transcription status:', error);
        throw error;
      }
    }

    throw new Error('Transcription timeout');
  }

  async getTranscript(transcriptionId) {
    try {
      const response = await axios({
        method: 'get',
        url: `${this.baseUrl}/transcript/${transcriptionId}`,
        headers: {
          'authorization': this.apiKey,
        }
      });

      return response.data;
    } catch (error) {
      console.error('AssemblyAI get transcript error:', error);
      throw error;
    }
  }
}

module.exports = new AssemblyAIService();