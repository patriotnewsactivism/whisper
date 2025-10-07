/**
 * AI Bot Router Service
 * Intelligently routes requests to the best AI service based on the prompt
 * Supports ChatGPT, Claude, Gemini, and other AI services
 */

const axios = require('axios');

class AIBotRouter {
  constructor(config = {}) {
    this.config = {
      openAIKey: config.openAIKey || process.env.OPENAI_API_KEY,
      anthropicKey: config.anthropicKey || process.env.ANTHROPIC_API_KEY,
      geminiKey: config.geminiKey || process.env.GEMINI_API_KEY,
      preferredService: config.preferredService || 'auto',
      ...config
    };

    this.services = {
      chatgpt: {
        name: 'ChatGPT',
        available: !!this.config.openAIKey,
        endpoint: 'https://api.openai.com/v1/chat/completions',
        models: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'],
        strengths: ['general', 'coding', 'analysis', 'creative']
      },
      claude: {
        name: 'Claude',
        available: !!this.config.anthropicKey,
        endpoint: 'https://api.anthropic.com/v1/messages',
        models: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
        strengths: ['analysis', 'writing', 'reasoning', 'long-context']
      },
      gemini: {
        name: 'Gemini',
        available: !!this.config.geminiKey,
        endpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
        models: ['gemini-pro', 'gemini-pro-vision'],
        strengths: ['multimodal', 'research', 'general']
      }
    };

    this.conversationHistory = [];
  }

  /**
   * Main routing method - analyzes prompt and selects best AI service
   * @param {string} prompt - User's prompt/question
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} - AI response
   */
  async route(prompt, options = {}) {
    try {
      console.log('Routing prompt to AI service...');

      // Analyze prompt to determine best service
      const selectedService = this.selectService(prompt, options);
      
      console.log(`Selected service: ${selectedService.name}`);

      // Route to appropriate service
      let response;
      switch (selectedService.id) {
        case 'chatgpt':
          response = await this.callChatGPT(prompt, options);
          break;
        case 'claude':
          response = await this.callClaude(prompt, options);
          break;
        case 'gemini':
          response = await this.callGemini(prompt, options);
          break;
        default:
          throw new Error(`Unsupported service: ${selectedService.id}`);
      }

      // Store in conversation history
      this.conversationHistory.push({
        timestamp: new Date().toISOString(),
        prompt: prompt,
        service: selectedService.id,
        response: response.content
      });

      return {
        success: true,
        service: selectedService.id,
        model: response.model,
        content: response.content,
        usage: response.usage,
        conversationId: this.conversationHistory.length
      };

    } catch (error) {
      console.error('AI routing error:', error);
      return {
        success: false,
        error: error.message,
        service: 'none'
      };
    }
  }

  /**
   * Select the best AI service based on prompt analysis
   * @param {string} prompt - User's prompt
   * @param {Object} options - Options including preferred service
   * @returns {Object} - Selected service info
   */
  selectService(prompt, options = {}) {
    // If user specified a service, use it
    if (options.service && this.services[options.service]?.available) {
      return {
        id: options.service,
        name: this.services[options.service].name,
        reason: 'User preference'
      };
    }

    // Analyze prompt to determine best service
    const promptLower = prompt.toLowerCase();
    
    // Check for coding-related prompts
    if (this.isCodingPrompt(promptLower) && this.services.chatgpt.available) {
      return {
        id: 'chatgpt',
        name: 'ChatGPT',
        reason: 'Best for coding tasks'
      };
    }

    // Check for analysis/reasoning prompts
    if (this.isAnalysisPrompt(promptLower) && this.services.claude.available) {
      return {
        id: 'claude',
        name: 'Claude',
        reason: 'Best for deep analysis'
      };
    }

    // Check for multimodal prompts
    if (this.isMultimodalPrompt(promptLower) && this.services.gemini.available) {
      return {
        id: 'gemini',
        name: 'Gemini',
        reason: 'Best for multimodal tasks'
      };
    }

    // Default to first available service
    for (const [id, service] of Object.entries(this.services)) {
      if (service.available) {
        return {
          id: id,
          name: service.name,
          reason: 'Default available service'
        };
      }
    }

    throw new Error('No AI services available');
  }

  /**
   * Check if prompt is coding-related
   * @param {string} prompt - Prompt text
   * @returns {boolean}
   */
  isCodingPrompt(prompt) {
    const codingKeywords = [
      'code', 'function', 'class', 'debug', 'error', 'bug',
      'javascript', 'python', 'java', 'react', 'api',
      'algorithm', 'programming', 'script', 'syntax'
    ];
    return codingKeywords.some(keyword => prompt.includes(keyword));
  }

  /**
   * Check if prompt requires deep analysis
   * @param {string} prompt - Prompt text
   * @returns {boolean}
   */
  isAnalysisPrompt(prompt) {
    const analysisKeywords = [
      'analyze', 'explain', 'compare', 'evaluate', 'assess',
      'reasoning', 'logic', 'argument', 'critique', 'review'
    ];
    return analysisKeywords.some(keyword => prompt.includes(keyword));
  }

  /**
   * Check if prompt is multimodal
   * @param {string} prompt - Prompt text
   * @returns {boolean}
   */
  isMultimodalPrompt(prompt) {
    const multimodalKeywords = [
      'image', 'picture', 'photo', 'visual', 'video',
      'diagram', 'chart', 'graph', 'screenshot'
    ];
    return multimodalKeywords.some(keyword => prompt.includes(keyword));
  }

  /**
   * Call ChatGPT API
   * @param {string} prompt - User prompt
   * @param {Object} options - API options
   * @returns {Promise<Object>} - Response
   */
  async callChatGPT(prompt, options = {}) {
    const model = options.model || 'gpt-4-turbo';
    
    const messages = [
      ...this.getContextMessages(),
      { role: 'user', content: prompt }
    ];

    const response = await axios.post(
      this.services.chatgpt.endpoint,
      {
        model: model,
        messages: messages,
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 2000
      },
      {
        headers: {
          'Authorization': `Bearer ${this.config.openAIKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      content: response.data.choices[0].message.content,
      model: model,
      usage: response.data.usage
    };
  }

  /**
   * Call Claude API
   * @param {string} prompt - User prompt
   * @param {Object} options - API options
   * @returns {Promise<Object>} - Response
   */
  async callClaude(prompt, options = {}) {
    const model = options.model || 'claude-3-sonnet-20240229';
    
    const messages = [
      ...this.getContextMessages(),
      { role: 'user', content: prompt }
    ];

    const response = await axios.post(
      this.services.claude.endpoint,
      {
        model: model,
        messages: messages,
        max_tokens: options.maxTokens || 2000,
        temperature: options.temperature || 0.7
      },
      {
        headers: {
          'x-api-key': this.config.anthropicKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      content: response.data.content[0].text,
      model: model,
      usage: response.data.usage
    };
  }

  /**
   * Call Gemini API
   * @param {string} prompt - User prompt
   * @param {Object} options - API options
   * @returns {Promise<Object>} - Response
   */
  async callGemini(prompt, options = {}) {
    const model = options.model || 'gemini-pro';
    
    const response = await axios.post(
      `${this.services.gemini.endpoint}/${model}:generateContent?key=${this.config.geminiKey}`,
      {
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: options.temperature || 0.7,
          maxOutputTokens: options.maxTokens || 2000
        }
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      content: response.data.candidates[0].content.parts[0].text,
      model: model,
      usage: {
        promptTokens: response.data.usageMetadata?.promptTokenCount || 0,
        completionTokens: response.data.usageMetadata?.candidatesTokenCount || 0
      }
    };
  }

  /**
   * Get conversation context messages
   * @returns {Array} - Context messages
   */
  getContextMessages() {
    // Return last 5 messages for context
    return this.conversationHistory
      .slice(-5)
      .map(item => [
        { role: 'user', content: item.prompt },
        { role: 'assistant', content: item.response }
      ])
      .flat();
  }

  /**
   * Get available services
   * @returns {Object} - Available services
   */
  getAvailableServices() {
    const available = {};
    for (const [id, service] of Object.entries(this.services)) {
      if (service.available) {
        available[id] = {
          name: service.name,
          models: service.models,
          strengths: service.strengths
        };
      }
    }
    return available;
  }

  /**
   * Get conversation history
   * @returns {Array} - Conversation history
   */
  getHistory() {
    return this.conversationHistory;
  }

  /**
   * Clear conversation history
   */
  clearHistory() {
    this.conversationHistory = [];
  }

  /**
   * Export conversation history
   * @returns {string} - JSON string of history
   */
  exportHistory() {
    return JSON.stringify(this.conversationHistory, null, 2);
  }
}

module.exports = AIBotRouter;