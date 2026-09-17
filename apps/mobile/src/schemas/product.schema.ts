import { z } from 'zod';

export const ProductSchema = z.object({
  id: z.string(),
  barcode: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  brand: z.string().nullable(),
  category: z.string().nullable(),
  imageUrl: z.string().url().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Product = z.infer<typeof ProductSchema>;

export const PimDocumentSchema = z.object({
  id: z.string(),
  kind: z.string(),
  language: z.string(),
  fileName: z.string(),
  updatedAt: z.string().nullable(),
  referenceCode: z.string().nullable().optional(),
  available: z.boolean().default(true),
});
export const PimDocumentsResponseSchema = z.object({ documents: z.array(PimDocumentSchema) });
export type PimDocument = z.infer<typeof PimDocumentSchema>;
