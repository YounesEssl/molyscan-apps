export interface ScannedProduct {
  id: string;
  barcode: string;
  name: string;
  brand: string;
  category: string;
  imageUri?: string;
}

export interface MolydalMatch {
  id: string;
  name: string;
  reference: string;
  category: string;
  confidenceScore: number;
  advantages: string[];
  technicalSheetUrl?: string;
}

export type ScanStatus = 'matched' | 'partial' | 'pending' | 'no_match';

export interface ScanRecord {
  id: string;
  scannedAt: string;
  scannedProduct: ScannedProduct;
  molydalMatch: MolydalMatch | null;
  status: ScanStatus;
  location?: string;
}
