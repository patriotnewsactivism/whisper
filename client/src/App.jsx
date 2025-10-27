import React, { useState } from 'react';
import './styles.css';

// If VITE_API_URL is provided, we use the Node server (dev/self-hosted).
// Otherwise, we assume Netlify Functions via redirects under /api/*.
const API_URL = import.meta.env.VITE_API_URL || '';
const USE_NODE_SERVER = Boolean(import.meta.env.VITE_API_URL);

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
      const endpoint = USE_NODE_SERVER
        ? `${API_URL}/api/youtube-transcript`
        : `/api/transcribe-youtube`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: youtubeUrl })
      });

      // Check if response is ok
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Netlify function returns { success, transcript, metadata }
      // Node server returns { transcript }
      const t = data.transcript || data?.result?.text;
      if (t) {
        setTranscript(typeof t === 'string' ? t : JSON.stringify(t, null, 2));
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
      let data;
      if (USE_NODE_SERVER) {
        const formData = new FormData();
        formData.append('audio', selectedFile);
        const response = await fetch(`${API_URL}/api/transcribe`, {
          method: 'POST',
          body: formData
        });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        data = await response.json();
      } else {
        // Netlify Functions path: use base64 JSON to /api/transcribe-upload (redirects to function)
        const fileBase64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result || '';
            const commaIdx = String(result).indexOf(',');
            resolve(commaIdx >= 0 ? String(result).slice(commaIdx + 1) : String(result));
          };
          reader.onerror = reject;
          reader.readAsDataURL(selectedFile);
        });

        const response = await fetch(`/api/transcribe-upload`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            file: fileBase64,
            fileName: selectedFile.name,
            fileType: selectedFile.type || 'audio/wav'
          })
        });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        data = await response.json();
      }

      // Node server returns { transcription }, function returns { success, transcript }
      const t = data.transcription || data.transcript || data?.result?.text;
      if (t) {
        setTranscript(typeof t === 'string' ? t : JSON.stringify(t, null, 2));
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