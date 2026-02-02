import { useCallback, useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { useScannerStore } from '@/stores/scanner.store';
import { useLocation } from '@/hooks/useLocation';
import { MOCK_SCANNED_PRODUCTS, MOCK_MOLYDAL_MATCHES } from '@/mocks/products.mock';
import type { BarcodeScanningResult, CameraView } from 'expo-camera';
import type { ScanRecord, ScanMethod } from '@/schemas/scan.schema';

const SCAN_COOLDOWN_MS = 2000;
const LABEL_ANALYSIS_DELAY_MS = 2000;

interface UseBarcodeScanReturn {
  handleBarcodeScanned: (result: BarcodeScanningResult, method?: ScanMethod) => void;
  captureLabel: (cameraRef: React.RefObject<CameraView | null>) => Promise<void>;
  isAnalyzingLabel: boolean;
  lastScanRecord: ScanRecord | null;
  isScanning: boolean;
  flashEnabled: boolean;
  toggleFlash: () => void;
  resetScan: () => void;
}

function findMockMatch(barcode: string, method: ScanMethod = 'barcode'): ScanRecord {
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
    scanMethod: method,
    location: null,
  };
}

function getRandomMockResult(): ScanRecord {
  const randomIndex = Math.floor(Math.random() * MOCK_SCANNED_PRODUCTS.length);
  const product = MOCK_SCANNED_PRODUCTS[randomIndex];
  const match = randomIndex < MOCK_MOLYDAL_MATCHES.length
    ? MOCK_MOLYDAL_MATCHES[randomIndex]
    : null;

  return {
    id: `scan-label-${Date.now()}`,
    barcode: product.barcode,
    scannedAt: new Date().toISOString(),
    scannedProduct: product,
    molydalMatch: match,
    status: match ? (match.confidence >= 80 ? 'matched' : 'partial') : 'no_match',
    scanMethod: 'label',
    location: null,
  };
}

export function useBarcodeScan(): UseBarcodeScanReturn {
  const lastScanTime = useRef<number>(0);
  const [isAnalyzingLabel, setIsAnalyzingLabel] = useState(false);
  const { getCurrentLocation } = useLocation();
  const {
    lastScanRecord,
    isScanning,
    flashEnabled,
    setLastScanRecord,
    setIsScanning,
    toggleFlash,
  } = useScannerStore();

  const handleBarcodeScanned = useCallback(
    async (result: BarcodeScanningResult, method: ScanMethod = 'barcode') => {
      const now = Date.now();
      if (now - lastScanTime.current < SCAN_COOLDOWN_MS) return;
      lastScanTime.current = now;

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      const scanRecord = findMockMatch(result.data, method);

      // Auto-geolocate
      const location = await getCurrentLocation();
      scanRecord.location = location;

      setLastScanRecord(scanRecord);
      setIsScanning(false);
    },
    [setLastScanRecord, setIsScanning, getCurrentLocation],
  );

  const captureLabel = useCallback(
    async (cameraRef: React.RefObject<CameraView | null>) => {
      if (isAnalyzingLabel) return;
      setIsAnalyzingLabel(true);

      try {
        // Take the photo (may fail on simulator, that's okay)
        try {
          await cameraRef.current?.takePictureAsync();
        } catch {
          // Ignore camera errors on simulator
        }

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        // Simulate OCR analysis delay
        await new Promise((r) => setTimeout(r, LABEL_ANALYSIS_DELAY_MS));

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        const scanRecord = getRandomMockResult();

        // Auto-geolocate
        const location = await getCurrentLocation();
        scanRecord.location = location;

        setLastScanRecord(scanRecord);
        setIsScanning(false);
      } finally {
        setIsAnalyzingLabel(false);
      }
    },
    [isAnalyzingLabel, setLastScanRecord, setIsScanning, getCurrentLocation],
  );

  const resetScan = useCallback(() => {
    setLastScanRecord(null);
    setIsScanning(true);
  }, [setLastScanRecord, setIsScanning]);

  return {
    handleBarcodeScanned,
    captureLabel,
    isAnalyzingLabel,
    lastScanRecord,
    isScanning,
    flashEnabled,
    toggleFlash,
    resetScan,
  };
}
