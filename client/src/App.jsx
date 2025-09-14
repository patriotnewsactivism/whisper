import React, { useState, useRef, useEffect } from 'react'

// Utility functions for formatting timestamps
function toSRT(segs) {
  const fmt = t => {
    const ms = Math.floor(t * 1000)
    const h = Math.floor(ms / 3600000)
    const m = Math.floor((ms % 3600000) / 60000)
    const s = Math.floor((ms % 60000) / 1000)
    const ms2 = ms % 1000
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms2).padStart(3, '0')}`
  }
  return segs.map((s, i) => `${i + 1}\n${fmt(s.start)} --> ${fmt(s.end)}\n${s.text.trim()}\n`).join('\n')
}

function toVTT(segs) {
  const fmt = t => {
    const ms = Math.floor(t * 1000)
    const h = Math.floor(ms / 3600000)
    const m = Math.floor((ms % 3600000) / 60000)
    const s = Math.floor((ms % 60000) / 1000)
    const ms2 = ms % 1000
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms2).padStart(3, '0')}`
  }
  return 'WEBVTT\n\n' + segs.map(s => `${fmt(s.start)} --> ${fmt(s.end)}\n${s.text.trim()}\n`).join('\n')
}

function download(name, text) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export default function App() {
  const [file, setFile] = useState(null)
  const [status, setStatus] = useState('idle')
  const [log, setLog] = useState([])
  const [modelId, setModelId] = useState('Xenova/whisper-small.en')
  const [text, setText] = useState('')
  const [segs, setSegs] = useState([])
  const [language, setLanguage] = useState('en')
  const fileInputRef = useRef(null)
  const logContainerRef = useRef(null)

  // Scroll to bottom of log when new entries are added
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight
    }
  }, [log])

  // Handle drag and drop events
  const handleDragOver = (e) => {
    e.preventDefault()
    const container = document.querySelector('.file-upload-container')
    if (container) {
      container.classList.add('drag-over')
    }
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    const container = document.querySelector('.file-upload-container')
    if (container) {
      container.classList.remove('drag-over')
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const container = document.querySelector('.file-upload-container')
    if (container) {
      container.classList.remove('drag-over')
    }
    
    const files = e.dataTransfer.files
    if (files.length > 0) {
      const selectedFile = files[0]
      if (selectedFile.type.startsWith('audio/') || selectedFile.type.startsWith('video/')) {
        setFile(selectedFile)
      } else {
        setStatus('error')
        setLog(prev => [...prev, 'Error: Please upload an audio or video file'])
      }
    }
  }

  // Transcribe function using OpenAI API
  async function transcribe() {
    if (!file) return
    
    setStatus('processing')
    setLog([])
    setText('')
    setSegs([])
    
    try {
      const fd = new FormData()
      fd.append("file", file)
      fd.append("model", "whisper-1")
      fd.append("language", language)
      fd.append("response_format", "verbose_json")
      
      setLog(prev => [...prev, 'Uploading file to server...'])
      
      const res = await fetch("/api/transcribe", {
        method: "POST",
        body: fd
      })
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`)
      }
      
      setLog(prev => [...prev, 'Processing transcription...'])
      
      const data = await res.json()
      
      if (data.error) {
        throw new Error(data.error.message || data.error)
      }
      
      setText(data.text || "")
      
      // Process segments if available
      const chunks = data.segments?.map(c => ({
        start: c.start ?? 0,
        end: c.end ?? 0,
        text: c.text || ''
      })) || []
      
      setSegs(chunks)
      setStatus('done')
      setLog(prev => [...prev, 'Transcription completed successfully!'])
    } catch (err) {
      setStatus('error')
      setLog(prev => [...prev, `Error: ${err.message}`])
      console.error('Transcription error:', err)
    }
  }

  const baseName = file ? file.name.replace(/\.[^/.]+$/, '') : 'transcript'
  const srt = segs.length ? toSRT(segs) : ''
  const vtt = segs.length ? toVTT(segs) : ''

  return (
    <div className="container">
      <div className="app-container">
        <h1>Whisper Transcriber</h1>
        <p className="subtitle">Convert audio and video to text with high accuracy</p>
        
        <div className="upload-section">
          <h2 className="section-title">Upload Media</h2>
          <div 
            className="file-upload-container"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="file-icon">📁</div>
            <p className="upload-text">Drag & drop your audio or video file here</p>
            <p className="upload-hint">Supports MP3, WAV, MP4, MOV, AVI and other formats</p>
            <button 
              className="upload-button" 
              onClick={() => fileInputRef.current?.click()}
            >
              Browse Files
            </button>
            <input
              type="file"
              ref={fileInputRef}
              className="file-input"
              accept="audio/*,video/*"
              onChange={e => setFile(e.target.files?.[0] || null)}
            />
            {file && <p className="file-name">Selected: {file.name}</p>}
          </div>
        </div>
        
        <div className="options-section">
          <h2 className="section-title">Transcription Options</h2>
          <div className="options-grid">
            <div className="option-group">
              <label className="option-label">Model</label>
              <select
                value={modelId}
                onChange={e => setModelId(e.target.value)}
                className="option-select"
              >
                <option value="Xenova/whisper-small.en">whisper-small.en (fast/accurate)</option>
                <option value="Xenova/whisper-base.en">whisper-base.en (fastest)</option>
                <option value="Xenova/whisper-medium.en">whisper-medium.en (better, slower)</option>
              </select>
            </div>
            
            <div className="option-group">
              <label className="option-label">Language</label>
              <select 
                value={language} 
                onChange={e => setLanguage(e.target.value)} 
                className="option-select"
              >
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
                <option value="it">Italian</option>
                <option value="pt">Portuguese</option>
                <option value="nl">Dutch</option>
                <option value="ru">Russian</option>
                <option value="zh">Chinese</option>
                <option value="ja">Japanese</option>
                <option value="ko">Korean</option>
              </select>
            </div>
          </div>
        </div>
        
        <div className="controls-section">
          <button 
            className="transcribe-button" 
            onClick={transcribe} 
            disabled={!file || status === 'processing'}
          >
            {status === 'processing' ? 'Processing...' : 'Transcribe'}
          </button>
        </div>
        
        <div className="status-section">
          <p className="status-text">
            Status: <span className={`status-value ${status}`}>{status}</span>
          </p>
          <div className={`spinner ${status === 'processing' ? 'active' : ''}`}></div>
          <div 
            className="progress-log" 
            ref={logContainerRef}
          >
            {log.map((l, i) => (
              <div key={i} className="log-entry">
                [{new Date().toLocaleTimeString()}] {l}
              </div>
            ))}
          </div>
        </div>
        
        {status === 'done' && (
          <div className="results-section active">
            <h2 className="results-title">Transcription Results</h2>
            
            <div className="download-buttons">
              <button 
                className="download-button" 
                onClick={() => download(`${baseName}.txt`, text)}
              >
                📄 Download .txt
              </button>
              <button 
                className="download-button" 
                onClick={() => download(`${baseName}.srt`, srt)} 
                disabled={!srt}
              >
                🎬 Download .srt
              </button>
              <button 
                className="download-button" 
                onClick={() => download(`${baseName}.vtt`, vtt)} 
                disabled={!vtt}
              >
                🎞️ Download .vtt
              </button>
              <button 
                className="download-button copy-button" 
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(text)
                    setLog(prev => [...prev, 'Transcript copied to clipboard!'])
                  } catch (err) {
                    setLog(prev => [...prev, 'Failed to copy transcript'])
                  }
                }}
              >
                📋 Copy Text
              </button>
            </div>
            
            <h3>Transcript Preview</h3>
            <textarea 
              className="transcript-preview"
              value={text} 
              readOnly 
            />
          </div>
        )}
        
        <div className="footer">
          <p>Powered by OpenAI Whisper API | Client-side processing with @xenova/transformers</p>
        </div>
      </div>
    </div>
  )
}