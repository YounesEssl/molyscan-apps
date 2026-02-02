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
