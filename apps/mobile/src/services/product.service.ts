import { api } from '@/lib/axios';
import { ENDPOINTS } from '@/constants/api';
import { ProductSchema, type Product } from '@/schemas/product.schema';

export const productService = {
  getByBarcode: async (barcode: string): Promise<Product> => {
    const { data } = await api.get(`${ENDPOINTS.products.byBarcode}/${barcode}`);
    return ProductSchema.parse(data);
  },
  getPimDocuments: async (name: string): Promise<PimDocument[]> => {
    const { data } = await api.get(ENDPOINTS.products.pimDocumentsByName(name));
    return (data?.documents ?? []) as PimDocument[];
  },
} as const;

export type PimDocument = {
  id: string;
  kind: 'technical_sheet' | 'product_sheet' | 'food_certificate' | string;
  language: string;
  fileName: string;
  updatedAt: string | null;
};
