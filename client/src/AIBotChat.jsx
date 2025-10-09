import React, { useState } from 'react';
import './EnhancedFeatures.css';

const AIBotChat = () => {
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSendMessage = async () => {
    if (!message.trim()) return;

    setLoading(true);
    setError('');

    try {
      const newUserMessage = { role: 'user', content: message };
      setChatHistory(prev => [...prev, newUserMessage]);

      const response = await fetch('/.netlify/functions/ai-bot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: message })
      });

      const data = await response.json();
      
      if (data.success) {
        const newBotMessage = { role: 'assistant', content: data.response };
        setChatHistory(prev => [...prev, newBotMessage]);
      } else {
        setError('AI response failed: ' + data.error);
      }
    } catch (err) {
      setError('Chat error: ' + err.message);
    } finally {
      setLoading(false);
      setMessage('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !loading) {
      handleSendMessage();
    }
  };

  return (
    <div className="ai-bot-chat">
      <div className="transcription-card">
        <h2>🤖 AI Assistant</h2>
        <p className="subtitle">Get help with your transcriptions and audio analysis</p>

        <div className="chat-container">
          <div className="chat-history">
            {chatHistory.map((msg, index) => (
              <div key={index} className={`chat-message ${msg.role}`}>
                <div className="message-header">
                  {msg.role === 'user' ? '👤 You' : '🤖 AI Assistant'}
                </div>
                <div className="message-content">{msg.content}</div>
              </div>
            ))}
            
            {loading && (
              <div className="chat-message assistant">
                <div className="message-header">🤖 AI Assistant</div>
                <div className="message-content">⏳ Thinking...</div>
              </div>
            )}
          </div>

          <div className="chat-input">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything about your transcriptions, audio files, or get help with analysis..."
              rows="3"
              className="chat-textarea"
            />
            <button 
              onClick={handleSendMessage}
              disabled={loading || !message.trim()}
              className="send-btn"
            >
              {loading ? '⏳ Sending...' : '📤 Send'}
            </button>
          </div>

          {error && (
            <div className="error-message">
              ❌ {error}
            </div>
          )}
        </div>

        <div className="ai-features">
          <h3>💡 What I Can Help With</h3>
          <ul>
            <li>Summarize long transcriptions</li>
            <li>Extract key points from audio</li>
            <li>Answer questions about your content</li>
            <li>Help with transcription formatting</li>
            <li>Provide insights and analysis</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AIBotChat;