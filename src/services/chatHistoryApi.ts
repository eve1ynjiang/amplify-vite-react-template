import axios from 'axios';

// Configuration
const API_BASE_URL = 'https://5hyi7dh4nl.execute-api.us-east-1.amazonaws.com/dev';
const USER_ID = 'user-123';

export interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: number | Date;
}

export interface Conversation {
  id: string;
  title: string;
  sessionId: string;
  messages: Message[];
  lastUpdated: number | Date;
  createdAt: number | Date;
}

class ChatHistoryAPI {
  private getHeaders() {
    return {
      'Content-Type': 'application/json',
      'X-User-ID': USER_ID
    };
  }

  private parseApiResponse(response: any): any {
    console.log('Raw API response:', response);
    
    // Handle different response formats
    let data = response.data;
    
    // If it's a Lambda proxy response with statusCode and body
    if (data && typeof data === 'object' && 'statusCode' in data && 'body' in data) {
      console.log('Lambda proxy response detected');
      if (data.statusCode !== 200 && data.statusCode !== 201) {
        const errorBody = typeof data.body === 'string' ? JSON.parse(data.body) : data.body;
        throw new Error(errorBody.error || `API request failed with status ${data.statusCode}`);
      }
      data = typeof data.body === 'string' ? JSON.parse(data.body) : data.body;
    }
    
    console.log('Parsed data:', data);
    return data;
  }

  private formatConversation(conversation: any): Conversation {
    return {
      ...conversation,
      messages: (conversation.messages || []).map((msg: any) => ({
        ...msg,
        timestamp: typeof msg.timestamp === 'number' ? new Date(msg.timestamp * 1000) : new Date(msg.timestamp)
      })),
      lastUpdated: typeof conversation.lastUpdated === 'number' 
        ? new Date(conversation.lastUpdated * 1000) 
        : new Date(conversation.lastUpdated),
      createdAt: typeof conversation.createdAt === 'number' 
        ? new Date(conversation.createdAt * 1000) 
        : new Date(conversation.createdAt)
    };
  }

  async getAllConversations(): Promise<Conversation[]> {
    try {
      console.log('Fetching conversations from:', `${API_BASE_URL}/conversations`);
      console.log('Headers:', this.getHeaders());
      
      const response = await axios.get(`${API_BASE_URL}/conversations`, {
        headers: this.getHeaders(),
        timeout: 10000 // 10 second timeout
      });
      
      const data = this.parseApiResponse(response);
      
      if (!Array.isArray(data)) {
        console.warn('Expected array but got:', typeof data, data);
        return [];
      }
      
      return data.map((conv: any) => this.formatConversation(conv));
    } catch (error: any) {
      console.error('Error fetching conversations:', error);
      
      // More specific error handling
      if (error.code === 'ERR_NETWORK') {
        throw new Error('Network error - check CORS configuration');
      } else if (error.response?.status === 403) {
        throw new Error('Access denied - check API permissions');
      } else if (error.response?.status === 500) {
        throw new Error('Server error - check Lambda function logs');
      }
      
      throw new Error('Failed to fetch conversations');
    }
  }

  async getConversation(conversationId: string): Promise<Conversation> {
    try {
      const response = await axios.get(`${API_BASE_URL}/conversations/${conversationId}`, {
        headers: this.getHeaders(),
        timeout: 10000
      });
      
      const data = this.parseApiResponse(response);
      return this.formatConversation(data);
    } catch (error) {
      console.error('Error fetching conversation:', error);
      throw new Error('Failed to fetch conversation');
    }
  }

  async createConversation(title?: string): Promise<Conversation> {
    try {
      console.log('Creating conversation with title:', title);
      
      const response = await axios.post(`${API_BASE_URL}/conversations`, {
        title: title || 'New Conversation'
      }, {
        headers: this.getHeaders(),
        timeout: 10000
      });
      
      const data = this.parseApiResponse(response);
      return this.formatConversation(data);
    } catch (error) {
      console.error('Error creating conversation:', error);
      throw new Error('Failed to create conversation');
    }
  }

  async updateConversation(conversationId: string, updates: Partial<Conversation>): Promise<Conversation> {
    try {
      // Convert Date objects back to timestamps for API
      const apiUpdates = {
        ...updates,
        messages: updates.messages?.map(msg => ({
          ...msg,
          timestamp: msg.timestamp instanceof Date ? msg.timestamp.getTime() / 1000 : msg.timestamp
        }))
      };

      console.log('Updating conversation:', conversationId, 'with:', apiUpdates);
      
      const response = await axios.put(`${API_BASE_URL}/conversations/${conversationId}`, apiUpdates, {
        headers: this.getHeaders(),
        timeout: 10000
      });
      
      const data = this.parseApiResponse(response);
      return this.formatConversation(data);
    } catch (error) {
      console.error('Error updating conversation:', error);
      throw new Error('Failed to update conversation');
    }
  }

  async deleteConversation(conversationId: string): Promise<void> {
    try {
      const response = await axios.delete(`${API_BASE_URL}/conversations/${conversationId}`, {
        headers: this.getHeaders(),
        timeout: 10000
      });
      
      this.parseApiResponse(response); // Just to check for errors
    } catch (error) {
      console.error('Error deleting conversation:', error);
      throw new Error('Failed to delete conversation');
    }
  }

  generateConversationTitle(messages: Message[]): string {
    const firstUserMessage = messages.find(m => m.isUser);
    if (firstUserMessage) {
      const text = firstUserMessage.text;
      return text.length > 50 ? text.substring(0, 50) + '...' : text;
    }
    return `Conversation ${new Date().toLocaleDateString()}`;
  }

  createNewConversationData(): Omit<Conversation, 'id' | 'createdAt' | 'lastUpdated'> {
    const welcomeMessage: Message = {
      id: '1',
      text: "Hello! I'm EcoAdvisor, your internal sustainability consultant. I'm familiar with our company's current sustainability initiatives, goals, and challenges. I can help you develop specific recommendations that build on our existing programs and align with our corporate sustainability strategy. What sustainability opportunity would you like to explore?",
      isUser: false,
      timestamp: new Date()
    };

    return {
      title: 'New Conversation',
      sessionId: '',
      messages: [welcomeMessage]
    };
  }
}

export const chatHistoryAPI = new ChatHistoryAPI();
export default chatHistoryAPI;
