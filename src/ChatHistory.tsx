import { useEffect, useState } from 'react';
import { chatHistoryAPI, Conversation } from './services/chatHistoryApi';

interface ChatHistoryProps {
  currentConversationId: string;
  onSelectConversation: (conversation: Conversation) => void;
  onNewConversation: () => void;
}

const ChatHistory = ({
  currentConversationId,
  onSelectConversation,
  onNewConversation,
}: ChatHistoryProps) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

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

  const handleDelete = async (event: React.MouseEvent, conversationId: string) => {
    event.stopPropagation(); // Prevent triggering the conversation selection
    
    if (window.confirm('Are you sure you want to delete this conversation?')) {
      setIsDeleting(conversationId);
      try {
        await chatHistoryAPI.deleteConversation(conversationId);
        // Remove the conversation from the local state
        setConversations(prevConversations => 
          prevConversations.filter(conv => conv.id !== conversationId)
        );
        // If the deleted conversation was selected, create a new one
        if (conversationId === currentConversationId) {
          onNewConversation();
        }
      } catch (error) {
        console.error('Error deleting conversation:', error);
        alert('Failed to delete conversation. Please try again.');
      } finally {
        setIsDeleting(null);
      }
    }
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const conversationDate = new Date(date);
    
    // If the conversation is from today, show only time
    if (conversationDate.toDateString() === now.toDateString()) {
      return conversationDate.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    }
    
    // If the conversation is from this year, show month and day
    if (conversationDate.getFullYear() === now.getFullYear()) {
      return conversationDate.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      });
    }
    
    // Otherwise show full date
    return conversationDate.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="chat-history-section">
      <div className="chat-history-header">
        <h3 className="chat-history-title">Chat History</h3>
      </div>

      <div className="chat-history-list">
        {conversations.length === 0 ? (
          <div className="chat-history-empty">
            No conversations yet. Start a new chat!
          </div>
        ) : (
          conversations.map((conversation) => (
            <div
              key={conversation.id}
              className={`chat-history-item ${
                conversation.id === currentConversationId ? 'selected' : ''
              }`}
              onClick={() => onSelectConversation(conversation)}
            >
              <div className="chat-history-item-content">
                <div className="chat-history-item-title">{conversation.title}</div>
                <div className="chat-history-item-date">
                  {formatDate(conversation.lastUpdated instanceof Date ? conversation.lastUpdated : new Date(conversation.lastUpdated))}
                </div>
              </div>
              <button
                className={`chat-history-delete-btn ${isDeleting === conversation.id ? 'deleting' : ''}`}
                onClick={(e) => handleDelete(e, conversation.id)}
                disabled={isDeleting !== null}
                title="Delete conversation"
              >
                {isDeleting === conversation.id ? '⏳' : '🗑️'}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ChatHistory;
