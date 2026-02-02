import { api } from '@/lib/axios';
import { ENDPOINTS } from '@/constants/api';
import type { AIConversation, AIMessage } from '@/schemas/chat.schema';

export const chatService = {
  async getConversations(): Promise<AIConversation[]> {
    const response = await api.get(ENDPOINTS.chat.conversations);
    return response.data;
  },

  async getMessages(conversationId: string): Promise<AIMessage[]> {
    const response = await api.get(ENDPOINTS.chat.messages(conversationId));
    return response.data;
  },

  async sendMessage(conversationId: string, text: string): Promise<{ userMessage: AIMessage; aiResponse: AIMessage }> {
    const response = await api.post(ENDPOINTS.chat.send(conversationId), { text });
    return response.data;
  },

  async createConversation(scanId: string, product: AIConversation['product']): Promise<AIConversation> {
    const response = await api.post(ENDPOINTS.chat.conversations, { scanId, product });
    return response.data;
  },
};
