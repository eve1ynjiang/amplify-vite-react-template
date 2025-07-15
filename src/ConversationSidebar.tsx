import { useState, useEffect } from 'react';
import { Conversation, chatHistoryAPI } from './services/chatHistoryApi';
import './ConversationSidebar.css';

interface ConversationSidebarProps {
  currentConversationId: string | null;
  onSelectConversation: (conversation: Conversation) => void;
  onNewConversation: () => void;
  isOpen: boolean;
  onToggle: () => void;
}

const ConversationSidebar = ({
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  isOpen,
  onToggle
}: ConversationSidebarProps) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadConversations();
    }
  }, [isOpen]);

  const loadConversations = async () => {
    try {
      setIsLoading(true);
      const allConversations = await chatHistoryAPI.getAllConversations();
      setConversations(allConversations);
    } catch (error) {
      console.error('Error loading conversations:', error);
      // Could show an error message to user here
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteConversation = async (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this conversation?')) {
      try {
        await chatHistoryAPI.deleteConversation(conversationId);
        
        // Remove from local state
        setConversations(prev => prev.filter(c => c.id !== conversationId));
        
        // If we deleted the current conversation, start a new one
        if (conversationId === currentConversationId) {
          onNewConversation();
        }
      } catch (error) {
        console.error('Error deleting conversation:', error);
        alert('Failed to delete conversation. Please try again.');
      }
    }
  };

  const formatDate = (date: Date | number) => {
    const dateObj = typeof date === 'number' ? new Date(date) : date;
    const now = new Date();
    const diffInHours = (now.getTime() - dateObj.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 24 * 7) {
      return dateObj.toLocaleDateString([], { weekday: 'short' });
    } else {
      return dateObj.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  return (
    <>
      <div className={`conversation-sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h3>Chat History</h3>
          <button onClick={onNewConversation} className="new-chat-button">
            ➕ New Chat
          </button>
        </div>
        
        <div className="conversations-list">
          {isLoading ? (
            <div className="loading-conversations">
              <div className="loading-spinner-small"></div>
              <p>Loading conversations...</p>
            </div>
          ) : conversations.length === 0 ? (
            <div className="no-conversations">
              <p>No conversations yet</p>
              <p>Start chatting with EcoAdvisor!</p>
            </div>
          ) : (
            conversations.map((conversation) => (
              <div
                key={conversation.id}
                className={`conversation-item ${
                  conversation.id === currentConversationId ? 'active' : ''
                }`}
                onClick={() => onSelectConversation(conversation)}
              >
                <div className="conversation-content">
                  <div className="conversation-title">{conversation.title}</div>
                  <div className="conversation-meta">
                    <span className="message-count">
                      {conversation.messages.filter(m => m.isUser).length} messages
                    </span>
                    <span className="conversation-date">
                      {formatDate(conversation.lastUpdated)}
                    </span>
                  </div>
                </div>
                <button
                  className="delete-conversation"
                  onClick={(e) => handleDeleteConversation(conversation.id, e)}
                  title="Delete conversation"
                >
                  🗑️
                </button>
              </div>
            ))
          )}
        </div>
      </div>
      
      <button className="sidebar-toggle" onClick={onToggle}>
        {isOpen ? '◀' : '▶'}
      </button>
      
      {isOpen && <div className="sidebar-overlay" onClick={onToggle} />}
    </>
  );
};

export default ConversationSidebar;
