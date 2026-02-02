import { MOCK_SCANS } from '@/mocks/scans.mock';
import { MOCK_SCANNED_PRODUCTS, MOCK_MOLYDAL_MATCHES } from '@/mocks/products.mock';
import { useOfflineStore } from '@/stores/offline.store';
import { insertOfflineScan } from '@/lib/database';
import type { ScanRecord } from '@/schemas/scan.schema';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const scanService = {
  async getHistory(): Promise<ScanRecord[]> {
    await delay(300);
    return MOCK_SCANS;
  },

  async getById(id: string): Promise<ScanRecord | undefined> {
    await delay(200);
    return MOCK_SCANS.find((s) => s.id === id);
  },

  async matchBarcode(barcode: string): Promise<ScanRecord> {
    const product = MOCK_SCANNED_PRODUCTS.find((p) => p.barcode === barcode) ?? MOCK_SCANNED_PRODUCTS[0];
    const matchIndex = MOCK_SCANNED_PRODUCTS.indexOf(product);
    const match = matchIndex < MOCK_MOLYDAL_MATCHES.length ? MOCK_MOLYDAL_MATCHES[matchIndex] : null;
    const record: ScanRecord = {
      id: `scan-${Date.now()}`,
      barcode,
      scannedProduct: product,
      molydalMatch: match,
      status: match ? (match.confidence >= 80 ? 'matched' : 'partial') : 'no_match',
      scannedAt: new Date().toISOString(),
      scanMethod: 'barcode',
      location: null,
    };

    const { isOffline } = useOfflineStore.getState();
    if (isOffline) {
      await insertOfflineScan(
        record.id,
        record.barcode,
        JSON.stringify(record),
        null,
      );
      await useOfflineStore.getState().loadPendingCount();
      return record;
    }

    await delay(800);
    return record;
  },
};
