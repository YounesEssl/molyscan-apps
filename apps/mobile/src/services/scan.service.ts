import { api } from '@/lib/axios';
import { ENDPOINTS } from '@/constants/api';
import type { ScanRecord } from '@/schemas/scan.schema';

export interface ScanLinkedConversation {
  id: string;
  title: string;
  scannedName: string | null;
  molydalName: string | null;
  lastMessage: { role: string; text: string; timestamp: string } | null;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

export const scanService = {
  async getHistory(): Promise<ScanRecord[]> {
    const response = await api.get(ENDPOINTS.scans.list);
    // Paginated endpoint returns { data, meta } — extract data
    return response.data.data ?? response.data;
  },

  async getById(id: string): Promise<ScanRecord | undefined> {
    const response = await api.get(ENDPOINTS.scans.detail(id));
    return response.data.data ?? response.data;
  },

  async getLinkedConversations(id: string): Promise<ScanLinkedConversation[]> {
    const response = await api.get(ENDPOINTS.scans.conversations(id));
    return response.data ?? [];
  },

  async submitEquivalentFeedback(
    scanId: string,
    payload: {
      equivalentName: string;
      vote: 'up' | 'down';
      suggestedName?: string;
    },
  ): Promise<void> {
    await api.post(ENDPOINTS.scans.equivalentFeedback(scanId), payload);
  },
};
