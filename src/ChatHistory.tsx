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
  }, [currentConversationId]);

  const loadConversations = async () => {
    console.log('ChatHistory: Loading conversations...');
    try {
      const loadedConversations = await chatHistoryAPI.getAllConversations();
      console.log('ChatHistory: Loaded conversations:', loadedConversations);
      setConversations(loadedConversations);
    } catch (error) {
      console.error('ChatHistory: Error loading conversations:', error);
    }
  };

  const handleNewChat = () => {
    // Only call onNewConversation, which will handle the creation
    onNewConversation();
  };

  const handleDelete = async (event: React.MouseEvent, conversationId: string) => {
    event.stopPropagation();
    
    if (window.confirm('Are you sure you want to delete this conversation?')) {
      setIsDeleting(conversationId);
      try {
        await chatHistoryAPI.deleteConversation(conversationId);
        
        // Find the index of the deleted conversation
        const deletedIndex = conversations.findIndex(conv => conv.id === conversationId);
        
        // Remove the deleted conversation from the state
        const updatedConversations = conversations.filter(conv => conv.id !== conversationId);
        setConversations(updatedConversations);

        // If the deleted conversation was selected
        if (conversationId === currentConversationId) {
          if (updatedConversations.length > 0) {
            // If there was a next conversation, select it
            // Otherwise, select the previous conversation
            const nextConversation = updatedConversations[deletedIndex] || 
                                   updatedConversations[deletedIndex - 1];
            if (nextConversation) {
              onSelectConversation(nextConversation);
            } else {
              // If no conversations left, create a new one
              onNewConversation();
            }
          } else {
            // If no conversations left, create a new one
            onNewConversation();
          }
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
    
    if (conversationDate.toDateString() === now.toDateString()) {
      return conversationDate.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    }
    
    if (conversationDate.getFullYear() === now.getFullYear()) {
      return conversationDate.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      });
    }
    
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
        <button onClick={handleNewChat} className="new-conversation-button">
          New Chat
        </button>
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
