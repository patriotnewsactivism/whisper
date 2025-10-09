import React, { useState, useRef } from 'react';
import './App.css';
import EnhancedTranscription from './EnhancedTranscription';
import LiveTranscriptionWithRecording from './LiveTranscriptionWithRecording';
import AIBotChat from './AIBotChat';

function App() {
  const [currentView, setCurrentView] = useState('transcription');
  const [user, setUser] = useState(null);

  return (
    <div className="App">
      <header className="app-header">
        <h1>🎙️ Multi-Service Transcription Hub</h1>
        <p>Powered by Whisper, AssemblyAI, ElevateAI & YouTube</p>
        
        <nav className="app-nav">
          <button 
            className={`nav-btn ${currentView === 'transcription' ? 'active' : ''}`}
            onClick={() => setCurrentView('transcription')}
          >
            📝 Transcription
          </button>
          <button 
            className={`nav-btn ${currentView === 'live' ? 'active' : ''}`}
            onClick={() => setCurrentView('live')}
          >
            🎤 Live Recording
          </button>
          <button 
            className={`nav-btn ${currentView === 'ai' ? 'active' : ''}`}
            onClick={() => setCurrentView('ai')}
          >
            🤖 AI Assistant
          </button>
        </nav>
      </header>

      <main className="app-main">
        {currentView === 'transcription' && (
          <EnhancedTranscription />
        )}
        
        {currentView === 'live' && (
          <LiveTranscriptionWithRecording />
        )}
        
        {currentView === 'ai' && (
          <AIBotChat />
        )}
      </main>

      <footer className="app-footer">
        <p>
          Services: Whisper • AssemblyAI • ElevateAI • YouTube • Live Recording • AI Chat
        </p>
      </footer>
    </div>
  );
}

export default App;