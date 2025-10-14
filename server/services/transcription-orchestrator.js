/**
 * Transcription Service Orchestrator
 * Intelligently routes transcription requests to the best available service
 */

const ElevateAIService = require('./elevateai-service');
const AssemblyAIService = require('./assemblyai-service');
const WhisperService = require('./whisper-service');
const YouTubeService = require('./youtube-service');
const fs = require('fs');
const path = require('path');

class TranscriptionOrchestrator {
  constructor(config = {}) {
    this.config = {
      elevateAIKey: config.elevateAIKey || 'ef7e91ce-7e9c-4bed-b074-100cda7ab848',
      assemblyAIKey: config.assemblyAIKey || process.env.ASSEMBLYAI_API_KEY,
      openAIKey: config.openAIKey || process.env.OPENAI_API_KEY,
      ...config
    };

    this.services = {
      elevateai: new ElevateAIService(this.config.elevateAIKey),
      assemblyai: new AssemblyAIService(this.config.assemblyAIKey),
      whisper: new WhisperService(this.config.openAIKey),
      youtube: new YouTubeService()
    };

    // Service selection rules
    this.rules = {
      fileSizeLimits: {
        whisper: 25 * 1024 * 1024, // 25MB
        elevateai: 450 * 1024 * 1024, // 450MB
        assemblyai: 2 * 1024 * 1024 * 1024 // 2GB
      },
      supportedFormats: {
        audio: ['mp3', 'wav', 'm4a', 'flac', 'aac', 'ogg', 'wma'],
        video: ['mp4', 'mov', 'avi', 'mkv', 'webm', '3gp', 'flv'],
        youtube: ['youtube']
      }
    };
  }

  /**
   * Main transcription method - intelligently selects the best service
   * @param {Object} request - Transcription request
   * @returns {Promise<Object>} - Transcription result
   */
  async transcribe(request) {
    try {
      const { type, source, options = {} } = request;

      console.log(`Processing ${type} transcription request...`);

      // Route based on type
      switch (type) {
        case 'youtube':
          return await this.transcribeYouTube(source, options);
        
        case 'file':
          return await this.transcribeFile(source, options);
        
        case 'url':
          return await this.transcribeUrl(source, options);
        
        default:
          throw new Error(`Unsupported transcription type: ${type}`);
      }

    } catch (error) {
      console.error('Transcription orchestrator error:', error);
      return {
        success: false,
        error: error.message,
        service: 'orchestrator'
      };
    }
  }

  /**
   * Transcribe YouTube video
   * @param {string} url - YouTube URL
   * @param {Object} options - Transcription options
   * @returns {Promise<Object>} - Transcription result
   */
  async transcribeYouTube(url, options = {}) {
    console.log('Processing YouTube URL:', url);
    
    // First try YouTube transcript extraction
    const youtubeResult = await this.services.youtube.getTranscript(url, options.language);
    
    if (youtubeResult.success) {
      return {
        ...youtubeResult,
        method: 'youtube-extraction'
      };
    }

    // Fallback: Download audio and transcribe
    console.log('YouTube transcript not available, downloading audio...');
    
    try {
      // Note: In a real implementation, you'd use youtube-dl or similar
      // For now, we'll return an error
      return {
        success: false,
        error: 'YouTube transcript not available and audio download not implemented',
        service: 'youtube'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        service: 'youtube'
      };
    }
  }

  /**
   * Transcribe uploaded file
   * @param {Object} file - File object (from multer)
   * @param {Object} options - Transcription options
   * @returns {Promise<Object>} - Transcription result
   */
  async transcribeFile(file, options = {}) {
    console.log('Processing file:', file.originalname);
    
    const fileSize = file.size;
    const fileExtension = path.extname(file.originalname).toLowerCase().slice(1);
    
    // Validate file type
    if (!this.isSupportedFormat(fileExtension)) {
      return {
        success: false,
        error: `Unsupported file format: ${fileExtension}`,
        supportedFormats: this.getSupportedFormats()
      };
    }

    // Select best service based on file size and availability
    const selectedService = this.selectBestService(fileSize, options.preferredService);
    
    console.log(`Selected service: ${selectedService.service} (${selectedService.reason})`);

    try {
      let result;
      
      switch (selectedService.service) {
        case 'elevateai':
          result = await this.services.elevateai.transcribeAudio(file.path, options.model || 'echo');
          break;
          
        case 'assemblyai':
          result = await this.services.assemblyai.transcribe(file.path, options);
          break;
          
        case 'whisper':
          result = await this.services.whisper.transcribe(file.path, options);
          break;
          
        default:
          throw new Error(`Unsupported service: ${selectedService.service}`);
      }

      // Clean up uploaded file
      this.cleanupFile(file.path);

      return {
        ...result,
        selectedService: selectedService.service,
        selectionReason: selectedService.reason
      };

    } catch (error) {
      // Clean up file on error
      this.cleanupFile(file.path);
      
      return {
        success: false,
        error: error.message,
        service: selectedService.service
      };
    }
  }

  /**
   * Select the best transcription service based on file size and preferences
   * @param {number} fileSize - File size in bytes
   * @param {string} preferredService - User's preferred service
   * @returns {Object} - Service selection result
   */
  selectBestService(fileSize, preferredService = null) {
    // If user has preference and it's valid, use it
    if (preferredService && this.isServiceAvailable(preferredService, fileSize)) {
      return {
        service: preferredService,
        reason: 'User preference'
      };
    }

    // Auto-select based on file size and service limits
    if (fileSize <= this.rules.fileSizeLimits.whisper) {
      return {
        service: 'whisper',
        reason: 'Optimal for small files (< 25MB)'
      };
    }
    
    if (fileSize <= this.rules.fileSizeLimits.elevateai) {
      return {
        service: 'elevateai',
        reason: 'Optimal for medium files (25MB - 450MB)'
      };
    }
    
    if (fileSize <= this.rules.fileSizeLimits.assemblyai) {
      return {
        service: 'assemblyai',
        reason: 'Optimal for large files (450MB - 2GB)'
      };
    }

    return {
      service: 'none',
      reason: 'File too large for all services'
    };
  }

  /**
   * Check if a service is available for given file size
   * @param {string} service - Service name
   * @param {number} fileSize - File size in bytes
   * @returns {boolean} - Service availability
   */
  isServiceAvailable(service, fileSize) {
    return fileSize <= this.rules.fileSizeLimits[service];
  }

  /**
   * Check if file format is supported
   * @param {string} extension - File extension
   * @returns {boolean} - Format support
   */
  isSupportedFormat(extension) {
    const allFormats = [
      ...this.rules.supportedFormats.audio,
      ...this.rules.supportedFormats.video
    ];
    return allFormats.includes(extension.toLowerCase());
  }

  /**
   * Get list of supported formats
   * @returns {Object} - Supported formats
   */
  getSupportedFormats() {
    return this.rules.supportedFormats;
  }

  /**
   * Get service capabilities summary
   * @returns {Object} - Service capabilities
   */
  getServiceCapabilities() {
    return {
      elevateai: {
        maxFileSize: this.rules.fileSizeLimits.elevateai,
        features: ['high-accuracy', 'enterprise-grade', 'multilingual'],
        models: ['echo', 'cx']
      },
      assemblyai: {
        maxFileSize: this.rules.fileSizeLimits.assemblyai,
        features: ['large-files', 'speaker-diarization', 'summarization'],
        models: ['best', 'nano']
      },
      whisper: {
        maxFileSize: this.rules.fileSizeLimits.whisper,
        features: ['quick-processing', 'multiple-formats', 'translation'],
        models: ['whisper-1']
      },
      youtube: {
        features: ['direct-extraction', 'metadata', 'multiple-languages']
      }
    };
  }

  /**
   * Clean up temporary files
   * @param {string} filePath - Path to file
   */
  cleanupFile(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log('Cleaned up temporary file:', filePath);
      }
    } catch (error) {
      console.warn('Failed to clean up file:', error.message);
    }
  }
}

module.exports = TranscriptionOrchestrator;