import React, { useState, useRef } from 'react';
import './styles.css';

const API_BASE_URL = '/.netlify/functions';

const EnhancedTranscription = () => {
  const [url, setUrl] = useState('');
  const [selectedService, setSelectedService] = useState('whisper');
  const [transcript, setTranscript] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [fileUrl, setFileUrl] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [transcriptionDetails, setTranscriptionDetails] = useState(null);
  const fileInputRef = useRef(null);

  const services = [
    { id: 'whisper', name: 'OpenAI Whisper', description: 'OpenAI\'s state-of-the-art speech recognition' },
    { id: 'assemblyai', name: 'AssemblyAI', description: 'Advanced AI-powered transcription with speaker diarization' },
    { id: 'elevateai', name: 'ElevateAI', description: 'Specialized transcription service' },
    { id: 'youtube', name: 'YouTube', description: 'Extract transcripts from YouTube videos' }
  ];

  const handleFileUpload = async (file) => {
    if (!file) return;

    setLoading(true);
    setError('');

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target.result.split(',')[1];
        
        const response = await fetch(`${API_BASE_URL}/upload`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            file: base64,
            fileName: file.name,
            fileType: file.type
          })
        });

        const data = await response.json();
        
        if (data.success) {
          setUploadedFile(file);
          setFileUrl(data.fileUrl);
          setError('');
        } else {
          setError(data.error || 'Upload failed');
        }
      };
      
      reader.readAsDataURL(file);
    } catch (err) {
      setError(`Upload error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleTranscribe = async () => {
    setLoading(true);
    setError('');
    setTranscript('');
    setTranscriptionDetails(null);

    try {
      let requestUrl = '';
      let requestBody = {};

      if (selectedService === 'youtube') {
        if (!url) {
          setError('Please enter a YouTube URL');
          setLoading(false);
          return;
        }
        requestUrl = `${API_BASE_URL}/transcribe`;
        requestBody = {
          service: 'youtube',
          url: url
        };
      } else {
        // Audio file transcription
        const fileUrlToUse = fileUrl || url;
        if (!fileUrlToUse) {
          setError('Please upload a file or provide an audio URL');
          setLoading(false);
          return;
        }
        
        requestUrl = `${API_BASE_URL}/transcribe`;
        requestBody = {
          service: selectedService,
          fileUrl: fileUrlToUse,
          fileType: uploadedFile?.type || 'audio/wav',
          customPrompt: customPrompt || undefined
        };
      }

      const response = await fetch(requestUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();
      
      if (data.success) {
        setTranscript(data.result.text || data.result);
        setTranscriptionDetails(data.result);
      } else {
        setError(data.error || 'Transcription failed');
      }
    } catch (err) {
      setError(`Transcription error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const clearFile = () => {
    setUploadedFile(null);
    setFileUrl('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getServiceIcon = (service) => {
    const icons = {
      whisper: '🤖',
      assemblyai: '🎯',
      elevateai: '⚡',
      youtube: '📺'
    };
    return icons[service] || '📝';
  };

  return (
    <div className="enhanced-transcription">
      <div className="transcription-card">
        <h2>🎙️ Multi-Service Transcription</h2>
        <p className="subtitle">Choose your preferred transcription service</p>

        {/* Service Selection */}
        <div className="service-selection">
          <h3>Select Service</h3>
          <div className="service-grid">
            {services.map(service => (
              <div 
                key={service.id} 
                className={`service-option ${selectedService === service.id ? 'selected' : ''}`}
                onClick={() => setSelectedService(service.id)}
              >
                <div className="service-icon">{getServiceIcon(service.id)}</div>
                <div className="service-info">
                  <h4>{service.name}</h4>
                  <p>{service.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Input Section */}
        <div className="input-section">
          <h3>{selectedService === 'youtube' ? 'YouTube URL' : 'Audio Input'}</h3>
          
          {selectedService === 'youtube' ? (
            <div className="youtube-input">
              <input
                type="url"
                placeholder="https://www.youtube.com/watch?v=..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="url-input"
              />
            </div>
          ) : (
            <div className="audio-input">
              {/* File Upload */}
              <div className="upload-section">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept="audio/*,video/*"
                  className="file-input"
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="upload-btn"
                  disabled={loading}
                >
                  📁 Choose Audio File
                </button>
                
                {uploadedFile && (
                  <div className="file-info">
                    <span>📄 {uploadedFile.name} ({(uploadedFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                    <button onClick={clearFile} className="clear-btn">❌</button>
                  </div>
                )}
              </div>

              {/* Or use URL */}
              <div className="or-divider">
                <span>OR</span>
              </div>
              
              <input
                type="url"
                placeholder="https://example.com/audio-file.mp3"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="url-input"
              />
            </div>
          )}

          {/* Custom Prompt (for services that support it) */}
          {(selectedService === 'whisper' || selectedService === 'assemblyai') && (
            <div className="prompt-section">
              <label>Custom Prompt (Optional):</label>
              <textarea
                placeholder="Enter custom instructions or context for better transcription..."
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                rows="3"
                className="prompt-input"
              />
            </div>
          )}
        </div>

        {/* Transcribe Button */}
        <button 
          onClick={handleTranscribe}
          disabled={loading || (!url && !fileUrl)}
          className="transcribe-btn"
        >
          {loading ? '⏳ Processing...' : '🎯 Transcribe'}
        </button>

        {/* Error Display */}
        {error && (
          <div className="error-message">
            ❌ {error}
          </div>
        )}

        {/* Results */}
        {transcript && (
          <div className="results-section">
            <h3>Transcription Results</h3>
            
            {transcriptionDetails && (
              <div className="transcription-details">
                <div className="detail-grid">
                  <div className="detail-item">
                    <span className="label">Service:</span>
                    <span className="value">{transcriptionDetails.service}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Language:</span>
                    <span className="value">{transcriptionDetails.language || 'en'}</span>
                  </div>
                  {transcriptionDetails.duration && (
                    <div className="detail-item">
                      <span className="label">Duration:</span>
                      <span className="value">{transcriptionDetails.duration.toFixed(2)}s</span>
                    </div>
                  )}
                  {transcriptionDetails.confidence && (
                    <div className="detail-item">
                      <span className="label">Confidence:</span>
                      <span className="value">{Math.round(transcriptionDetails.confidence * 100)}%</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="transcript-output">
              <h4>Transcript:</h4>
              <div className="transcript-text">
                {transcript}
              </div>
              <button 
                onClick={() => navigator.clipboard.writeText(transcript)}
                className="copy-btn"
              >
                📋 Copy Transcript
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedTranscription;