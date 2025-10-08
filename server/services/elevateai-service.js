/**
 * ElevateAI Service Integration
 * Uses the ElevateAI API for high-accuracy transcription
 * API Key: ef7e91ce-7e9c-4bed-b074-100cda7ab848
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

class ElevateAIService {
  constructor(apiKey) {
    this.apiKey = apiKey || 'ef7e91ce-7e9c-4bed-b074-100cda7ab848';
    this.baseURL = 'https://api.elevateai.com';
  }

  /**
   * Upload and transcribe audio file using ElevateAI
   * @param {string} filePath - Path to the audio file
   * @param {string} model - Transcription model ('echo' or 'cx')
   * @returns {Promise<Object>} - Transcription result
   */
  async transcribeAudio(filePath, model = 'echo') {
    try {
      console.log('Starting ElevateAI transcription...');
      
      // Step 1: Declare the interaction
      const declareResponse = await this.declareInteraction(model);
      const interactionId = declareResponse.interactionIdentifier;
      
      console.log('Interaction declared:', interactionId);

      // Step 2: Upload the audio file
      await this.uploadAudio(interactionId, filePath);
      
      console.log('Audio uploaded, waiting for processing...');

      // Step 3: Wait for processing to complete
      const transcript = await this.waitForProcessing(interactionId);
      
      return {
        success: true,
        transcript: transcript,
        service: 'elevateai',
        model: model,
        interactionId: interactionId
      };

    } catch (error) {
      console.error('ElevateAI transcription error:', error);
      return {
        success: false,
        error: error.message,
        service: 'elevateai'
      };
    }
  }

  /**
   * Declare a new audio interaction
   * @param {string} model - Transcription model
   * @returns {Promise<Object>} - Declaration response
   */
  async declareInteraction(model = 'echo') {
    const url = `${this.baseURL}/v1/interactions/audio`;
    
    const payload = {
      model: model,
      language: 'en-US',
      transcriptionMode: 'highAccuracy'
    };

    const response = await axios.post(url, payload, {
      headers: {
        'X-API-Token': this.apiKey,
        'Content-Type': 'application/json'
      }
    });

    return response.data;
  }

  /**
   * Upload audio file to declared interaction
   * @param {string} interactionId - Interaction identifier
   * @param {string} filePath - Path to audio file
   * @returns {Promise<void>}
   */
  async uploadAudio(interactionId, filePath) {
    const url = `${this.baseURL}/v1/interactions/${interactionId}/upload`;
    
    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath));

    await axios.post(url, formData, {
      headers: {
        'X-API-Token': this.apiKey,
        ...formData.getHeaders()
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity
    });
  }

  /**
   * Check processing status
   * @param {string} interactionId - Interaction identifier
   * @returns {Promise<Object>} - Status response
   */
  async checkStatus(interactionId) {
    const url = `${this.baseURL}/v1/interactions/${interactionId}/status`;
    
    const response = await axios.get(url, {
      headers: {
        'X-API-Token': this.apiKey
      }
    });

    return response.data;
  }

  /**
   * Get transcript from completed interaction
   * @param {string} interactionId - Interaction identifier
   * @returns {Promise<string>} - Transcript text
   */
  async getTranscript(interactionId) {
    const url = `${this.baseURL}/v1/interactions/${interactionId}/transcript`;
    
    const response = await axios.get(url, {
      headers: {
        'X-API-Token': this.apiKey
      }
    });

    return response.data.transcript;
  }

  /**
   * Wait for processing to complete and return transcript
   * @param {string} interactionId - Interaction identifier
   * @returns {Promise<string>} - Final transcript
   */
  async waitForProcessing(interactionId) {
    const maxWaitTime = 300000; // 5 minutes
    const checkInterval = 2000; // 2 seconds
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      const status = await this.checkStatus(interactionId);
      
      if (status.status === 'completed') {
        return await this.getTranscript(interactionId);
      }
      
      if (status.status === 'failed') {
        throw new Error('ElevateAI processing failed: ' + status.errorMessage);
      }

      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }

    throw new Error('ElevateAI processing timeout after 5 minutes');
  }

  /**
   * Get supported languages for Echo model
   * @returns {Promise<Array>} - List of supported languages
   */
  async getSupportedLanguages() {
    const url = `${this.baseURL}/v1/models/echo/languages`;
    
    const response = await axios.get(url, {
      headers: {
        'X-API-Token': this.apiKey
      }
    });

    return response.data.languages;
  }
}

module.exports = ElevateAIService;