import { api } from '@/lib/axios';
import { ENDPOINTS } from '@/constants/api';
import { ProductSchema, PimDocumentsResponseSchema, type Product, type PimDocument } from '@/schemas/product.schema';
import { File, Paths } from 'expo-file-system';

export const productService = {
  getByBarcode: async (barcode: string): Promise<Product> => {
    const { data } = await api.get(`${ENDPOINTS.products.byBarcode}/${barcode}`);
    return ProductSchema.parse(data);
  },
  getPimDocuments: async (name: string): Promise<PimDocument[]> => {
    const { data } = await api.get(ENDPOINTS.products.pimDocumentsByName(name));
    return PimDocumentsResponseSchema.parse(data).documents;
  },
  downloadPimDocument: async (id: string): Promise<string> => {
    // Axios keeps the normal JWT refresh path; a WebView cannot refresh an
    // expired token and Android WebView cannot display PDFs at all.
    const { data } = await api.get<ArrayBuffer>(ENDPOINTS.products.pimDocumentContent(id), {
      responseType: 'arraybuffer', timeout: 60_000,
      headers: { Accept: 'application/pdf' },
    });
    const bytes = new Uint8Array(data);
    const header = String.fromCharCode(...bytes.subarray(0, 1024));
    if (!header.includes('%PDF-')) throw new Error('Invalid PDF response');
    const file = new File(Paths.cache, `molyscan-${id.replace(/[^a-zA-Z0-9_-]/g, '')}.pdf`);
    file.create({ overwrite: true });
    file.write(bytes);
    return file.uri;
  },
} as const;

export type { PimDocument };

export function selectTechnicalSheet(documents: PimDocument[], language: string): PimDocument | undefined {
  const sheets = documents.filter((d) => d.kind === 'technical_sheet' && d.available);
  return sheets.find((d) => d.language === language.split('-')[0]) ?? sheets.find((d) => d.language === 'fr') ?? sheets.find((d) => d.language === 'en') ?? sheets[0];
}
