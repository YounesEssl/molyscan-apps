/**
 * Service for AI chat — connects to the NestJS API.
 * Supports conversation CRUD and SSE streaming.
 */
import { api } from '@/lib/axios';
import { storage } from '@/lib/storage';
import { API_CONFIG } from '@/constants/api';

export interface ChatConversation {
  id: string;
  type: 'free' | 'product';
  title: string;
  product: {
    scannedName: string;
    scannedBrand: string;
    molydalName: string;
    molydalReference: string;
  } | null;
  lastMessage: {
    role: string;
    text: string;
    timestamp: string;
  } | null;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: string[];
  isStreaming?: boolean;
}

interface StreamCallbacks {
  onToken: (token: string) => void;
  onSources: (sources: string[]) => void;
  onDone: () => void;
  onError: (error: string) => void;
}

export const chatFreeService = {
  /** List all conversations for current user */
  async getConversations(): Promise<ChatConversation[]> {
    const res = await api.get('/chat/conversations');
    return res.data;
  },

  /** Create a new free conversation */
  async createConversation(title?: string): Promise<ChatConversation> {
    const res = await api.post('/chat/conversations/free', { title });
    return res.data;
  },

  /** Create a product-linked conversation */
  async createProductConversation(product: {
    scannedName: string;
    scannedBrand: string;
    molydalName: string;
  }): Promise<ChatConversation> {
    const res = await api.post('/chat/conversations', {
      product: {
        scannedName: product.scannedName,
        scannedBrand: product.scannedBrand,
        molydalName: product.molydalName,
        molydalReference: product.molydalName,
      },
    });
    return res.data;
  },

  /** Delete a conversation */
  async deleteConversation(id: string): Promise<void> {
    await api.delete(`/chat/conversations/${id}`);
  },

  /** Get messages for a conversation */
  async getMessages(conversationId: string): Promise<ChatMessage[]> {
    const res = await api.get(`/chat/conversations/${conversationId}/messages`);
    return (res.data || []).map((m: any) => ({
      id: m.id,
      role: m.role,
      content: m.text,
      sources: m.sources,
    }));
  },

  /** Send a message with SSE streaming response */
  async sendMessageStreaming(
    conversationId: string,
    text: string,
    callbacks: StreamCallbacks,
    attachmentId?: string,
  ): Promise<void> {
    try {
      const token = await storage.getToken();

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${API_CONFIG.baseURL}/chat/conversations/${conversationId}/stream`);
        xhr.setRequestHeader('Content-Type', 'application/json');
        if (token) {
          xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        }
        xhr.responseType = 'text';

        let lastIndex = 0;

        xhr.onprogress = () => {
          const newData = xhr.responseText.slice(lastIndex);
          lastIndex = xhr.responseText.length;

          const lines = newData.split('\n');
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data: ')) continue;

            const data = trimmed.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              if (parsed.type === 'text') {
                callbacks.onToken(parsed.content);
              } else if (parsed.type === 'sources') {
                callbacks.onSources(parsed.sources);
              }
            } catch {
              // silent: malformed SSE chunk, it's ok to fail
            }
          }
        };

        xhr.onload = () => {
          callbacks.onDone();
          resolve();
        };

        xhr.onerror = () => {
          callbacks.onError(`Network error (${xhr.status})`);
          reject(new Error('Network error'));
        };

        xhr.send(JSON.stringify({ text, ...(attachmentId ? { attachmentId } : {}) }));
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Network error';
      callbacks.onError(msg);
    }
  },
};
