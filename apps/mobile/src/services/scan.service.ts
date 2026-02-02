import { api } from '@/lib/axios';
import { ENDPOINTS } from '@/constants/api';
import { useOfflineStore } from '@/stores/offline.store';
import { insertOfflineScan } from '@/lib/database';
import type { ScanRecord } from '@/schemas/scan.schema';

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

  async matchBarcode(barcode: string, scanMethod: string = 'barcode'): Promise<ScanRecord> {
    const { isOffline } = useOfflineStore.getState();
    if (isOffline) {
      const record: ScanRecord = {
        id: `scan-offline-${Date.now()}`,
        barcode,
        scannedProduct: { name: barcode, brand: 'Inconnu', category: 'Non classé', barcode },
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
};
