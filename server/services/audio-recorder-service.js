/**
 * Live Audio Recording Service
 * Captures audio during transcription and saves it for later use
 */

class AudioRecorderService {
  constructor() {
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.stream = null;
    this.isRecording = false;
    this.recordingStartTime = null;
    this.recordingId = null;
  }

  /**
   * Initialize audio recording
   * @param {Object} options - Recording options
   * @returns {Promise<boolean>} - Success status
   */
  async initialize(options = {}) {
    try {
      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: options.sampleRate || 44100,
          channelCount: options.channelCount || 1
        }
      };

      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Determine the best MIME type
      const mimeType = this.getBestMimeType();
      
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: mimeType,
        audioBitsPerSecond: options.bitrate || 128000
      });

      this.setupEventHandlers();
      
      console.log('Audio recorder initialized with:', mimeType);
      return true;

    } catch (error) {
      console.error('Failed to initialize audio recorder:', error);
      throw new Error('Microphone access denied or not available');
    }
  }

  /**
   * Get the best available MIME type for recording
   * @returns {string} - MIME type
   */
  getBestMimeType() {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4',
      'audio/wav'
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    return ''; // Use default
  }

  /**
   * Setup event handlers for MediaRecorder
   */
  setupEventHandlers() {
    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };

    this.mediaRecorder.onstop = async () => {
      await this.saveRecording();
    };

    this.mediaRecorder.onerror = (error) => {
      console.error('MediaRecorder error:', error);
    };
  }

  /**
   * Start recording audio
   * @param {string} recordingId - Unique identifier for this recording
   * @returns {Promise<Object>} - Recording info
   */
  async startRecording(recordingId = null) {
    if (!this.mediaRecorder) {
      await this.initialize();
    }

    if (this.isRecording) {
      throw new Error('Recording already in progress');
    }

    this.audioChunks = [];
    this.recordingId = recordingId || `recording_${Date.now()}`;
    this.recordingStartTime = Date.now();
    
    this.mediaRecorder.start(1000); // Collect data every second
    this.isRecording = true;

    console.log('Recording started:', this.recordingId);

    return {
      recordingId: this.recordingId,
      startTime: this.recordingStartTime,
      status: 'recording'
    };
  }

  /**
   * Stop recording audio
   * @returns {Promise<Object>} - Recording result
   */
  async stopRecording() {
    if (!this.isRecording) {
      throw new Error('No recording in progress');
    }

    return new Promise((resolve, reject) => {
      this.mediaRecorder.onstop = async () => {
        try {
          const result = await this.saveRecording();
          this.isRecording = false;
          resolve(result);
        } catch (error) {
          reject(error);
        }
      };

      this.mediaRecorder.stop();
    });
  }

  /**
   * Pause recording
   */
  pauseRecording() {
    if (this.isRecording && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.pause();
      console.log('Recording paused');
    }
  }

  /**
   * Resume recording
   */
  resumeRecording() {
    if (this.isRecording && this.mediaRecorder.state === 'paused') {
      this.mediaRecorder.resume();
      console.log('Recording resumed');
    }
  }

  /**
   * Save the recorded audio
   * @returns {Promise<Object>} - Saved recording info
   */
  async saveRecording() {
    const audioBlob = new Blob(this.audioChunks, { 
      type: this.mediaRecorder.mimeType 
    });

    const duration = Date.now() - this.recordingStartTime;
    const fileExtension = this.getFileExtension(this.mediaRecorder.mimeType);
    const fileName = `${this.recordingId}.${fileExtension}`;

    // Create download URL
    const audioUrl = URL.createObjectURL(audioBlob);

    // Save to server
    const savedFile = await this.uploadToServer(audioBlob, fileName);

    const recordingInfo = {
      recordingId: this.recordingId,
      fileName: fileName,
      fileSize: audioBlob.size,
      duration: duration,
      mimeType: this.mediaRecorder.mimeType,
      audioUrl: audioUrl,
      serverPath: savedFile.path,
      timestamp: new Date().toISOString()
    };

    console.log('Recording saved:', recordingInfo);

    return recordingInfo;
  }

  /**
   * Upload audio to server
   * @param {Blob} audioBlob - Audio data
   * @param {string} fileName - File name
   * @returns {Promise<Object>} - Upload result
   */
  async uploadToServer(audioBlob, fileName) {
    const formData = new FormData();
    formData.append('audio', audioBlob, fileName);
    formData.append('recordingId', this.recordingId);

    try {
      const response = await fetch('/api/save-recording', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to upload recording');
      }

      const result = await response.json();
      return result;

    } catch (error) {
      console.error('Upload error:', error);
      // Return local info if upload fails
      return {
        path: 'local',
        url: URL.createObjectURL(audioBlob)
      };
    }
  }

  /**
   * Get file extension from MIME type
   * @param {string} mimeType - MIME type
   * @returns {string} - File extension
   */
  getFileExtension(mimeType) {
    const extensions = {
      'audio/webm': 'webm',
      'audio/ogg': 'ogg',
      'audio/mp4': 'm4a',
      'audio/wav': 'wav'
    };

    for (const [type, ext] of Object.entries(extensions)) {
      if (mimeType.includes(type)) {
        return ext;
      }
    }

    return 'webm'; // Default
  }

  /**
   * Get recording status
   * @returns {Object} - Current status
   */
  getStatus() {
    return {
      isRecording: this.isRecording,
      recordingId: this.recordingId,
      duration: this.isRecording ? Date.now() - this.recordingStartTime : 0,
      state: this.mediaRecorder?.state || 'inactive'
    };
  }

  /**
   * Clean up resources
   */
  cleanup() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
    }
    
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
    }

    this.audioChunks = [];
    this.isRecording = false;
    
    console.log('Audio recorder cleaned up');
  }

  /**
   * Download recording locally
   * @param {string} audioUrl - Audio URL
   * @param {string} fileName - File name
   */
  downloadRecording(audioUrl, fileName) {
    const a = document.createElement('a');
    a.href = audioUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}

// Export for use in browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AudioRecorderService;
}