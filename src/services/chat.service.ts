import { MOCK_AI_CONVERSATIONS } from '@/mocks/chat.mock';
import type { AIConversation, AIMessage } from '@/schemas/chat.schema';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

const MOCK_AI_RESPONSES: string[] = [
  "D'après nos fiches techniques, ce produit Molydal offre une meilleure tenue thermique et une compatibilité élargie avec les élastomères standards. Je vous recommande de vérifier la fiche technique pour les spécifications exactes.",
  "Oui, ce produit est adapté à cette application. Il répond aux normes ISO en vigueur et figure dans notre liste de compatibilités validées par nos laboratoires.",
  "Le conditionnement le plus courant pour cette référence est le fût de 200L. Des formats de 20L et 1000L (IBC) sont également disponibles sur commande.",
];

export const chatService = {
  async getConversations(): Promise<AIConversation[]> {
    await delay(300);
    return MOCK_AI_CONVERSATIONS;
  },

  async getMessages(conversationId: string): Promise<AIMessage[]> {
    await delay(200);
    const conv = MOCK_AI_CONVERSATIONS.find((c) => c.id === conversationId);
    return conv?.messages ?? [];
  },

  async sendMessage(conversationId: string, text: string): Promise<{ userMessage: AIMessage; aiResponse: AIMessage }> {
    const userMessage: AIMessage = {
      id: `msg-${Date.now()}`,
      conversationId,
      role: 'user',
      text,
      timestamp: new Date().toISOString(),
    };

    // Simulate AI thinking time
    await delay(800 + Math.random() * 700);

    const aiResponse: AIMessage = {
      id: `msg-${Date.now() + 1}`,
      conversationId,
      role: 'assistant',
      text: MOCK_AI_RESPONSES[Math.floor(Math.random() * MOCK_AI_RESPONSES.length)],
      timestamp: new Date().toISOString(),
      sources: ['FT-MOL-REF', 'Guide équivalences Molydal 2024'],
    };

    return { userMessage, aiResponse };
  },

  async createConversation(scanId: string, product: AIConversation['product']): Promise<AIConversation> {
    await delay(300);
    const now = new Date().toISOString();
    return {
      id: `conv-${Date.now()}`,
      scanId,
      product,
      messages: [],
      createdAt: now,
      updatedAt: now,
    };
  },
};
