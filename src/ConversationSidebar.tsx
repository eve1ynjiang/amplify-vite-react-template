import { useEffect, useState } from 'react';
import { chatHistoryAPI, Conversation } from './services/chatHistoryApi';
import './ConversationSidebar.css';

interface ConversationSidebarProps {
  currentConversationId: string;
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
  onToggle,
}: ConversationSidebarProps) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      const loadedConversations = await chatHistoryAPI.getAllConversations();
      setConversations(loadedConversations);
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onToggle();
    }
  };

  return (
    <>
      <div className={`sidebar-overlay ${isOpen ? 'open' : ''}`} onClick={handleOverlayClick}></div>
      <div className={`conversation-sidebar ${isOpen ? 'open' : ''}`}>
        <button className="toggle-button" onClick={onToggle}>
          {isOpen ? '×' : '☰'}
        </button>
        
        <div className="sidebar-header">
          <h3 className="sidebar-title">Chat History</h3>
        </div>

        <button className="new-chat-button" onClick={onNewConversation}>
          + New Chat
        </button>

        <div className="conversation-list">
          {conversations.map((conversation) => (
            <div
              key={conversation.id}
              className={`conversation-item ${
                conversation.id === currentConversationId ? 'selected' : ''
              }`}
              onClick={() => onSelectConversation(conversation)}
            >
              <div className="conversation-item-title">{conversation.title}</div>
              <div className="conversation-item-date">
                {formatDate(conversation.lastUpdated instanceof Date ? conversation.lastUpdated : new Date(conversation.lastUpdated))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default ConversationSidebar;
