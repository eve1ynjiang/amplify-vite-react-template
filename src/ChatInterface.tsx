import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import './ChatInterface.css';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

interface ChatInterfaceProps {
  onBack: () => void;
}

const ChatInterface = ({ onBack }: ChatInterfaceProps) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Hello! I'm EcoAdvisor, your internal sustainability consultant. I'm familiar with our company's current sustainability initiatives, goals, and challenges. I can help you develop specific recommendations that build on our existing programs and align with our corporate sustainability strategy. What sustainability opportunity would you like to explore?",
      isUser: false,
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>(() => {
    // Load session ID from localStorage on component mount
    return localStorage.getItem('ecoAdvisorSessionId') || '';
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Save session ID to localStorage whenever it changes
  useEffect(() => {
    if (sessionId) {
      localStorage.setItem('ecoAdvisorSessionId', sessionId);
    }
  }, [sessionId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const startNewConversation = () => {
    setSessionId('');
    localStorage.removeItem('ecoAdvisorSessionId');
    setMessages([
      {
        id: '1',
        text: "Hello! I'm EcoAdvisor, your internal sustainability consultant. I'm familiar with our company's current sustainability initiatives, goals, and challenges. I can help you develop specific recommendations that build on our existing programs and align with our corporate sustainability strategy. What sustainability opportunity would you like to explore?",
        isUser: false,
        timestamp: new Date()
      }
    ]);
  };

  const sendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const question = inputText.trim();

    const userMessage: Message = {
      id: Date.now().toString(),
      text: question,
      isUser: true,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      // Send request to your chat endpoint with session management
      const response = await axios.post(
        'https://5hyi7dh4nl.execute-api.us-east-1.amazonaws.com/dev/chat',
        {
          question: question,
          knowledge_base_id: 'LASQYEZT5Q',
          session_id: sessionId // Include session ID for conversation continuity
        }
      );

      // Parse the response body (it's a JSON string)
      const responseData = JSON.parse(response.data.body);
      
      // Update session ID if we got a new one from Bedrock
      if (responseData.sessionId && responseData.sessionId !== sessionId) {
        setSessionId(responseData.sessionId);
        console.log('Updated session ID:', responseData.sessionId);
      }

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: responseData.answer || 'I apologize, but I couldn\'t process your question at the moment.',
        isUser: false,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Sorry, I encountered an error while processing your question. Please try again.',
        isUser: false,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);
      console.error('Chat error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <button onClick={onBack} className="back-button">
          ← Back to Upload
        </button>
        <h2>EcoAdvisor - Internal Sustainability Consultant</h2>
        <div className="header-actions">
          <button onClick={startNewConversation} className="new-conversation-button">
            🔄 New Conversation
          </button>
          <div className="chat-status">
            <span className="status-indicator"></span>
            Connected {sessionId && '(Session Active)'}
          </div>
        </div>
      </div>

      <div className="chat-messages">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`message ${message.isUser ? 'user-message' : 'bot-message'}`}
          >
            <div className="message-content">
              <div className="message-text">{message.text}</div>
              <div className="message-time">{formatTime(message.timestamp)}</div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="message bot-message">
            <div className="message-content">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-container">
        <div className="chat-input-wrapper">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about our sustainability strategy and next steps..."
            className="chat-input"
            rows={1}
            disabled={isLoading}
          />
          <button
            onClick={sendMessage}
            disabled={!inputText.trim() || isLoading}
            className="send-button"
          >
            {isLoading ? '⏳' : '📤'}
          </button>
        </div>
        <div className="input-hint">
          Press Enter to send, Shift+Enter for new line
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
