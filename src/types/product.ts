export interface Product {
  id: string;
  barcode: string;
  name: string;
  description: string | null;
  brand: string | null;
  category: string | null;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
}
