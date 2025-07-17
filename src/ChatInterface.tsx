import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Conversation, Message, chatHistoryAPI } from './services/chatHistoryApi';
import './ChatInterface.css';

interface ChatInterfaceProps {
  onBack?: () => void;
  embedded?: boolean;
  currentConversation?: Conversation | null;
  onConversationUpdate?: (conversation: Conversation) => void;
}

const ChatInterface = ({ 
  onBack, 
  embedded = false,
  currentConversation: propConversation,
  onConversationUpdate
}: ChatInterfaceProps) => {
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingConversation, setIsLoadingConversation] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Use prop conversation if provided, otherwise load initial conversation
  useEffect(() => {
    if (propConversation) {
      setCurrentConversation(propConversation);
      setIsLoadingConversation(false);
    } else {
      loadInitialConversation();
    }
  }, [propConversation]);

  const loadInitialConversation = async () => {
    try {
      setIsLoadingConversation(true);
      
      // Try to get existing conversations
      const conversations = await chatHistoryAPI.getAllConversations();
      
      if (conversations.length > 0) {
        // Load the most recent conversation
        setCurrentConversation(conversations[0]);
      } else {
        // Create a new conversation if none exist
        const newConversation = await chatHistoryAPI.createConversation();
        setCurrentConversation(newConversation);
      }
    } catch (error) {
      console.error('Error loading initial conversation:', error);
      // Fallback to creating a local conversation
      const fallbackConversation = {
        id: Date.now().toString(),
        title: 'New Conversation',
        sessionId: '',
        messages: [{
          id: '1',
          text: "Hello! I'm EcoAdvisor, your internal sustainability consultant. I'm familiar with our company's current sustainability initiatives, goals, and challenges. I can help you develop specific recommendations that build on our existing programs and align with our corporate sustainability strategy. What sustainability opportunity would you like to explore?",
          isUser: false,
          timestamp: new Date()
        }],
        lastUpdated: new Date(),
        createdAt: new Date()
      };
      setCurrentConversation(fallbackConversation);
    } finally {
      setIsLoadingConversation(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (currentConversation) {
      scrollToBottom();
    }
  }, [currentConversation?.messages]);

  const handleNewConversation = async () => {
    try {
      const newConversation = await chatHistoryAPI.createConversation();
      setCurrentConversation(newConversation);
      if (onConversationUpdate) {
        onConversationUpdate(newConversation);
      }
    } catch (error) {
      console.error('Error creating new conversation:', error);
      // Fallback to local conversation
      const fallbackConversation = {
        id: Date.now().toString(),
        title: 'New Conversation',
        sessionId: '',
        messages: [{
          id: '1',
          text: "Hello! I'm EcoAdvisor, your internal sustainability consultant. I'm familiar with our company's current sustainability initiatives, goals, and challenges. I can help you develop specific recommendations that build on our existing programs and align with our corporate sustainability strategy. What sustainability opportunity would you like to explore?",
          isUser: false,
          timestamp: new Date()
        }],
        lastUpdated: new Date(),
        createdAt: new Date()
      };
      setCurrentConversation(fallbackConversation);
      if (onConversationUpdate) {
        onConversationUpdate(fallbackConversation);
      }
    }
  };

  const updateConversationInDB = async (updatedConversation: Conversation) => {
    try {
      await chatHistoryAPI.updateConversation(updatedConversation.id, updatedConversation);
      if (onConversationUpdate) {
        onConversationUpdate(updatedConversation);
      }
    } catch (error) {
      console.error('Error saving conversation to database:', error);
      // Continue with local state even if DB save fails
    }
  };

  const updateConversationTitle = async (messages: Message[]) => {
    if (currentConversation && currentConversation.title === 'New Conversation' && messages.length > 1) {
      const title = chatHistoryAPI.generateConversationTitle(messages);
      const updatedConversation = {
        ...currentConversation,
        title,
        lastUpdated: new Date()
      };
      setCurrentConversation(updatedConversation);
      await updateConversationInDB(updatedConversation);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() || isLoading || !currentConversation) return;

    const question = inputText.trim();

    const userMessage: Message = {
      id: Date.now().toString(),
      text: question,
      isUser: true,
      timestamp: new Date()
    };

    // Update conversation with user message locally first
    const updatedMessages = [...currentConversation.messages, userMessage];
    const updatedConversation = {
      ...currentConversation,
      messages: updatedMessages,
      lastUpdated: new Date()
    };
    
    setCurrentConversation(updatedConversation);
    setInputText('');
    setIsLoading(true);

    try {
      // Send request to your chat endpoint with session management
      console.log('Sending chat request:', {
        question: question,
        knowledge_base_id: 'LASQYEZT5Q',
        session_id: currentConversation.sessionId
      });

      const response = await axios.post(
        'https://5hyi7dh4nl.execute-api.us-east-1.amazonaws.com/dev/chat',
        {
          question: question,
          knowledge_base_id: 'LASQYEZT5Q',
          session_id: currentConversation.sessionId
        }
      );

      console.log('Raw chat response:', response);
      console.log('Response data:', response.data);

      // Handle different response formats
      let responseData;
      let answerText = '';
      let sessionId = currentConversation.sessionId;

      // Check if response.data has a body property (Lambda proxy response)
      if (response.data && typeof response.data === 'object' && 'body' in response.data) {
        console.log('Lambda proxy response detected');
        try {
          responseData = JSON.parse(response.data.body);
          console.log('Parsed response data:', responseData);
        } catch (parseError) {
          console.error('Error parsing response body:', parseError);
          responseData = response.data;
        }
      } else {
        // Direct response
        responseData = response.data;
      }

      // Extract answer text from various possible formats
      if (responseData.answer) {
        answerText = responseData.answer;
      } else if (responseData.output && responseData.output.text) {
        answerText = responseData.output.text;
      } else if (responseData.text) {
        answerText = responseData.text;
      } else if (typeof responseData === 'string') {
        answerText = responseData;
      } else {
        console.warn('Could not find answer in response:', responseData);
        answerText = 'I apologize, but I couldn\'t process your question at the moment.';
      }

      // Extract session ID if available
      if (responseData.sessionId) {
        sessionId = responseData.sessionId;
      } else if (responseData.session_id) {
        sessionId = responseData.session_id;
      }

      console.log('Extracted answer:', answerText);
      console.log('Extracted session ID:', sessionId);
      
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: answerText,
        isUser: false,
        timestamp: new Date()
      };

      // Update conversation with bot message
      const finalMessages = [...updatedMessages, botMessage];
      const finalConversation = {
        ...updatedConversation,
        messages: finalMessages,
        sessionId: sessionId,
        lastUpdated: new Date()
      };
      
      console.log('Final conversation state:', finalConversation);
      setCurrentConversation(finalConversation);
      
      // Save to database
      await updateConversationInDB(finalConversation);
      
      // Update title if this is a new conversation
      await updateConversationTitle(finalMessages);
      
    } catch (error) {
      console.error('Chat error:', error);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Sorry, I encountered an error while processing your question. Please try again.',
        isUser: false,
        timestamp: new Date()
      };

      const errorConversation = {
        ...updatedConversation,
        messages: [...updatedMessages, errorMessage],
        lastUpdated: new Date()
      };
      
      setCurrentConversation(errorConversation);
      
      // Try to save error state to database
      await updateConversationInDB(errorConversation);
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

  if (isLoadingConversation) {
    return (
      <div className={`chat-container ${embedded ? 'embedded' : ''}`}>
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading your conversations...</p>
        </div>
      </div>
    );
  }

  if (!currentConversation) {
    return (
      <div className={`chat-container ${embedded ? 'embedded' : ''}`}>
        <div className="error-container">
          <p>Failed to load conversation. Please try refreshing the page.</p>
          <button onClick={loadInitialConversation} className="retry-button">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`chat-container ${embedded ? 'embedded' : ''}`}>
      <div className="chat-header">
        {!embedded && onBack && (
          <button onClick={onBack} className="back-button">
            ← Back to Upload
          </button>
        )}
        <div className="header-center">
          <h2>EcoAdvisor - Internal Sustainability Consultant</h2>
          <div className="conversation-title">{currentConversation.title}</div>
        </div>
        <div className="header-actions">
          <button onClick={handleNewConversation} className="new-conversation-button">
            New Chat
          </button>
          <div className="chat-status">
            <span className="status-indicator"></span>
            Connected {currentConversation.sessionId && '(Session Active)'}
          </div>
        </div>
      </div>

      <div className="chat-messages">
        {currentConversation.messages.map((message) => (
          <div
            key={message.id}
            className={`message ${message.isUser ? 'user-message' : 'bot-message'}`}
          >
            <div className="message-content">
              <div className="message-text">{message.text}</div>
              <div className="message-time">{formatTime(message.timestamp instanceof Date ? message.timestamp : new Date(message.timestamp))}</div>
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
