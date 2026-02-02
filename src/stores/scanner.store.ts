import { create } from 'zustand';
import type { ScanRecord, ScanMethod } from '@/schemas/scan.schema';

interface ScannerState {
  lastScanRecord: ScanRecord | null;
  isScanning: boolean;
  flashEnabled: boolean;
  scanMode: ScanMethod;
  setLastScanRecord: (record: ScanRecord | null) => void;
  setIsScanning: (scanning: boolean) => void;
  toggleFlash: () => void;
  setScanMode: (mode: ScanMethod) => void;
  reset: () => void;
}

export const useScannerStore = create<ScannerState>((set) => ({
  lastScanRecord: null,
  isScanning: true,
  flashEnabled: false,
  scanMode: 'camera',
  setLastScanRecord: (record) => set({ lastScanRecord: record }),
  setIsScanning: (scanning) => set({ isScanning: scanning }),
  toggleFlash: () => set((s) => ({ flashEnabled: !s.flashEnabled })),
  setScanMode: (mode) => set({ scanMode: mode }),
  reset: () => set({ lastScanRecord: null, isScanning: true, flashEnabled: false, scanMode: 'camera' }),
}));
