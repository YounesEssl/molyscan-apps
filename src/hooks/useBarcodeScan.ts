import { useCallback, useRef } from 'react';
import * as Haptics from 'expo-haptics';
import { useScannerStore } from '@/stores/scanner.store';
import { MOCK_SCANNED_PRODUCTS, MOCK_MOLYDAL_MATCHES } from '@/mocks/products.mock';
import type { BarcodeScanningResult } from 'expo-camera';
import type { ScanRecord } from '@/schemas/scan.schema';

const SCAN_COOLDOWN_MS = 2000;

interface UseBarcodeScanReturn {
  handleBarcodeScanned: (result: BarcodeScanningResult) => void;
  lastScanRecord: ScanRecord | null;
  isScanning: boolean;
  flashEnabled: boolean;
  toggleFlash: () => void;
  resetScan: () => void;
}

function findMockMatch(barcode: string): ScanRecord {
  const productIndex = MOCK_SCANNED_PRODUCTS.findIndex((p) => p.barcode === barcode);
  const scannedProduct = productIndex >= 0
    ? MOCK_SCANNED_PRODUCTS[productIndex]
    : {
        name: `Produit inconnu (${barcode})`,
        brand: 'Inconnu',
        category: 'Non classé',
        barcode,
      };

  const match = productIndex >= 0 && productIndex < MOCK_MOLYDAL_MATCHES.length
    ? MOCK_MOLYDAL_MATCHES[productIndex]
    : null;

  return {
    id: `scan-${Date.now()}`,
    barcode,
    scannedAt: new Date().toISOString(),
    scannedProduct,
    molydalMatch: match,
    status: match ? (match.confidence >= 80 ? 'matched' : 'partial') : 'no_match',
    scanMethod: 'camera',
    location: null,
  };
}

export function useBarcodeScan(): UseBarcodeScanReturn {
  const lastScanTime = useRef<number>(0);
  const {
    lastScanRecord,
    isScanning,
    flashEnabled,
    setLastScanRecord,
    setIsScanning,
    toggleFlash,
  } = useScannerStore();

  const handleBarcodeScanned = useCallback(
    (result: BarcodeScanningResult) => {
      const now = Date.now();
      if (now - lastScanTime.current < SCAN_COOLDOWN_MS) return;
      lastScanTime.current = now;

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      const scanRecord = findMockMatch(result.data);
      setLastScanRecord(scanRecord);
      setIsScanning(false);
    },
    [setLastScanRecord, setIsScanning],
  );

  const resetScan = useCallback(() => {
    setLastScanRecord(null);
    setIsScanning(true);
  }, [setLastScanRecord, setIsScanning]);

  return {
    handleBarcodeScanned,
    lastScanRecord,
    isScanning,
    flashEnabled,
    toggleFlash,
    resetScan,
  };
}
