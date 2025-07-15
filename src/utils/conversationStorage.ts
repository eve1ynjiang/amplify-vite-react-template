export interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

export interface Conversation {
  id: string;
  title: string;
  sessionId: string;
  messages: Message[];
  lastUpdated: Date;
  createdAt: Date;
}

const STORAGE_KEY = 'ecoAdvisorConversations';
const CURRENT_CONVERSATION_KEY = 'ecoAdvisorCurrentConversation';

export class ConversationStorage {
  static getAllConversations(): Conversation[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return [];
      
      const conversations = JSON.parse(stored);
      return conversations.map((conv: any) => ({
        ...conv,
        lastUpdated: new Date(conv.lastUpdated),
        createdAt: new Date(conv.createdAt),
        messages: conv.messages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }))
      }));
    } catch (error) {
      console.error('Error loading conversations:', error);
      return [];
    }
  }

  static saveConversation(conversation: Conversation): void {
    try {
      const conversations = this.getAllConversations();
      const existingIndex = conversations.findIndex(c => c.id === conversation.id);
      
      if (existingIndex >= 0) {
        conversations[existingIndex] = conversation;
      } else {
        conversations.push(conversation);
      }
      
      // Sort by last updated (most recent first)
      conversations.sort((a, b) => b.lastUpdated.getTime() - a.lastUpdated.getTime());
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
    } catch (error) {
      console.error('Error saving conversation:', error);
    }
  }

  static deleteConversation(conversationId: string): void {
    try {
      const conversations = this.getAllConversations();
      const filtered = conversations.filter(c => c.id !== conversationId);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.error('Error deleting conversation:', error);
    }
  }

  static getCurrentConversationId(): string | null {
    return localStorage.getItem(CURRENT_CONVERSATION_KEY);
  }

  static setCurrentConversationId(conversationId: string): void {
    localStorage.setItem(CURRENT_CONVERSATION_KEY, conversationId);
  }

  static generateConversationTitle(messages: Message[]): string {
    // Find the first user message to generate a title
    const firstUserMessage = messages.find(m => m.isUser);
    if (firstUserMessage) {
      const text = firstUserMessage.text;
      // Take first 50 characters and add ellipsis if longer
      return text.length > 50 ? text.substring(0, 50) + '...' : text;
    }
    return `Conversation ${new Date().toLocaleDateString()}`;
  }

  static createNewConversation(): Conversation {
    const welcomeMessage: Message = {
      id: '1',
      text: "Hello! I'm EcoAdvisor, your internal sustainability consultant. I'm familiar with our company's current sustainability initiatives, goals, and challenges. I can help you develop specific recommendations that build on our existing programs and align with our corporate sustainability strategy. What sustainability opportunity would you like to explore?",
      isUser: false,
      timestamp: new Date()
    };

    return {
      id: Date.now().toString(),
      title: 'New Conversation',
      sessionId: '',
      messages: [welcomeMessage],
      lastUpdated: new Date(),
      createdAt: new Date()
    };
  }
}
