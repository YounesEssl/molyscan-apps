import { useCallback, useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { useScannerStore } from '@/stores/scanner.store';
import { useLocation } from '@/hooks/useLocation';
import { scanService } from '@/services/scan.service';
import type { BarcodeScanningResult, CameraView } from 'expo-camera';
import type { ScanRecord, ScanMethod } from '@/schemas/scan.schema';

const SCAN_COOLDOWN_MS = 2000;

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

      try {
        const scanRecord = await scanService.matchBarcode(result.data, method);

        // Auto-geolocate
        const location = await getCurrentLocation();
        scanRecord.location = location;

        setLastScanRecord(scanRecord);
        setIsScanning(false);
      } catch (error) {
        if (__DEV__) console.error('[useBarcodeScan] matchBarcode failed:', error);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
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

        // TODO: Send image to OCR endpoint when available
        // For now, label capture is not functional without a real OCR backend
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
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
