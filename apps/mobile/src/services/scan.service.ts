import { api } from '@/lib/axios';
import { ENDPOINTS } from '@/constants/api';
import { useOfflineStore } from '@/stores/offline.store';
import { insertOfflineScan } from '@/lib/database';
import type { ScanRecord } from '@/schemas/scan.schema';
import i18n from '@/i18n';

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
    return response.data;
  },

  async getLinkedConversations(id: string): Promise<ScanLinkedConversation[]> {
    const response = await api.get(ENDPOINTS.scans.conversations(id));
    return response.data ?? [];
  },

  async matchBarcode(barcode: string, scanMethod: string = 'barcode'): Promise<ScanRecord> {
    const { isOffline } = useOfflineStore.getState();
    if (isOffline) {
      const record: ScanRecord = {
        id: `scan-offline-${Date.now()}`,
        barcode,
        scannedProduct: { name: barcode, brand: i18n.t('common.unknown'), category: i18n.t('common.uncategorized'), barcode },
        molydalMatch: null,
        status: 'no_match',
        scannedAt: new Date().toISOString(),
        scanMethod: scanMethod as 'barcode' | 'label' | 'voice',
        location: null,
      };
      await insertOfflineScan(record.id, record.barcode, JSON.stringify(record), null);
      await useOfflineStore.getState().loadPendingCount();
      return record;
    }

    const response = await api.post(ENDPOINTS.scans.create, { barcode, scanMethod });
    return response.data;
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
