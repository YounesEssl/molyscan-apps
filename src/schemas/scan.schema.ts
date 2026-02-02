import { z } from 'zod';

export const ScanMethodSchema = z.enum(['camera', 'voice']);
export type ScanMethod = z.infer<typeof ScanMethodSchema>;

export const ScanLocationSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  label: z.string().optional(),
});
export type ScanLocation = z.infer<typeof ScanLocationSchema>;

export const ScannedProductSchema = z.object({
  name: z.string(),
  brand: z.string(),
  category: z.string(),
  subcategory: z.string().optional(),
  barcode: z.string(),
});
export type ScannedProduct = z.infer<typeof ScannedProductSchema>;

export const MolydalMatchSchema = z.object({
  id: z.string(),
  name: z.string(),
  reference: z.string(),
  category: z.string(),
  confidence: z.number().min(0).max(100),
  pricingTier: z.enum(['standard', 'premium', 'enterprise']).optional(),
});
export type MolydalMatch = z.infer<typeof MolydalMatchSchema>;

export const ScanStatusSchema = z.enum(['matched', 'partial', 'no_match']);
export type ScanStatus = z.infer<typeof ScanStatusSchema>;

export const ScanRecordSchema = z.object({
  id: z.string(),
  barcode: z.string(),
  scannedProduct: ScannedProductSchema,
  molydalMatch: MolydalMatchSchema.nullable(),
  status: ScanStatusSchema,
  scannedAt: z.string().datetime(),
  scanMethod: ScanMethodSchema.default('camera'),
  location: ScanLocationSchema.nullable().default(null),
  userId: z.string().optional(),
});
export type ScanRecord = z.infer<typeof ScanRecordSchema>;
