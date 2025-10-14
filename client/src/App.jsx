import React, { useState } from 'react';
import './styles.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function App() {
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [transcript, setTranscript] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleYouTubeTranscribe = async () => {
    if (!youtubeUrl) {
      setError('Please enter a YouTube URL');
      return;
    }

    setLoading(true);
    setError('');
    setTranscript('');

    try {
      const response = await fetch(`${API_URL}/api/youtube-transcript`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: youtubeUrl })
      });

      // Check if response is ok
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Get response text first to debug
      const text = await response.text();
      console.log('Response text:', text);

      // Try to parse JSON
      let data;
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        throw new Error('Invalid JSON response from server');
      }
      
      if (data.transcript) {
        setTranscript(data.transcript);
      } else {
        setError(data.error || 'Failed to transcribe YouTube video');
      }
    } catch (err) {
      console.error('Transcription error:', err);
      setError('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileTranscribe = async () => {
    if (!selectedFile) {
      setError('Please select a file');
      return;
    }

    setLoading(true);
    setError('');
    setTranscript('');

    try {
      const formData = new FormData();
      formData.append('audio', selectedFile);

      const response = await fetch(`${API_URL}/api/transcribe`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.transcription) {
        setTranscript(typeof data.transcription === 'string' ? data.transcription : JSON.stringify(data.transcription, null, 2));
      } else {
        setError(data.error || 'Failed to transcribe file');
      }
    } catch (err) {
      console.error('File transcription error:', err);
      setError('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>🎙️ Multi-Service Transcription App</h1>
        <p>YouTube & File Upload Transcription</p>
      </header>

      <main>
        <section className="transcription-section">
          <h2>📺 YouTube Transcription</h2>
          <input
            type="text"
            placeholder="Enter YouTube URL (e.g., https://www.youtube.com/watch?v=...)"
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            className="url-input"
          />
          <button onClick={handleYouTubeTranscribe} disabled={loading}>
            {loading ? '⏳ Transcribing...' : '▶️ Transcribe YouTube'}
          </button>
        </section>

        <section className="transcription-section">
          <h2>📁 File Upload Transcription</h2>
          <input
            type="file"
            accept="audio/*,video/*"
            onChange={(e) => setSelectedFile(e.target.files[0])}
            className="file-input"
          />
          {selectedFile && (
            <p className="file-info">Selected: {selectedFile.name}</p>
          )}
          <button onClick={handleFileTranscribe} disabled={loading || !selectedFile}>
            {loading ? '⏳ Transcribing...' : '▶️ Transcribe File'}
          </button>
        </section>

        {error && (
          <div className="error-message">
            <h3>❌ Error:</h3>
            <p>{error}</p>
          </div>
        )}

        {transcript && (
          <div className="transcript-result">
            <h3>✅ Transcript:</h3>
            <pre>{transcript}</pre>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;