import { api } from '@/lib/axios';
import { ENDPOINTS } from '@/constants/api';
import { ProductSchema, type Product } from '@/schemas/product.schema';

export const productService = {
  getByBarcode: async (barcode: string): Promise<Product> => {
    const { data } = await api.get(`${ENDPOINTS.products.byBarcode}/${barcode}`);
    return ProductSchema.parse(data);
  },
} as const;
