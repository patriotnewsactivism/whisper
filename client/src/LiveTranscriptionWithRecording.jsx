import React, { useState, useRef } from 'react';
import './EnhancedFeatures.css';

const LiveTranscriptionWithRecording = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        processRecording(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setError('');
    } catch (err) {
      setError('Failed to start recording: ' + err.message);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processRecording = async (audioBlob) => {
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64Audio = e.target.result.split(',')[1];
        
        // Upload to server
        const uploadResponse = await fetch('/.netlify/functions/save-recording', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audio: base64Audio,
            fileName: `recording-${Date.now()}.wav`,
            fileType: 'audio/wav'
          })
        });

        const uploadData = await uploadResponse.json();
        
        if (uploadData.success) {
          // Transcribe the recording
          const transcribeResponse = await fetch('/.netlify/functions/transcribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              service: 'whisper',
              fileUrl: uploadData.fileUrl,
              fileType: 'audio/wav'
            })
          });

          const transcriptData = await transcribeResponse.json();
          
          if (transcriptData.success) {
            setTranscript(transcriptData.result.text);
          } else {
            setError('Transcription failed: ' + transcriptData.error);
          }
        } else {
          setError('Upload failed: ' + uploadData.error);
        }
      };
      
      reader.readAsDataURL(audioBlob);
    } catch (err) {
      setError('Processing failed: ' + err.message);
    }
  };

  return (
    <div className="live-transcription">
      <div className="transcription-card">
        <h2>🎤 Live Audio Recording</h2>
        <p className="subtitle">Record and transcribe audio in real-time</p>

        <div className="recording-controls">
          {!isRecording ? (
            <button onClick={startRecording} className="record-btn">
              🔴 Start Recording
            </button>
          ) : (
            <button onClick={stopRecording} className="stop-btn">
              ⏹️ Stop Recording
            </button>
          )}
        </div>

        {error && (
          <div className="error-message">
            ❌ {error}
          </div>
        )}

        {transcript && (
          <div className="results-section">
            <h3>Live Transcription</h3>
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
        )}
      </div>
    </div>
  );
};

export default LiveTranscriptionWithRecording;