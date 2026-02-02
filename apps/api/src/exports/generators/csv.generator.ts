import { Injectable } from '@nestjs/common';

@Injectable()
export class CsvGenerator {
  async generate(scans: any[]): Promise<Buffer> {
    const headers = ['Date', 'Barcode', 'Produit concurrent', 'Marque', 'Catégorie', 'Équivalent Molydal', 'Référence', 'Confiance (%)', 'Statut'];
    const rows = scans.map((scan) => {
      const product = scan.competitorProduct;
      const equiv = product?.equivalences?.[0];
      return [
        scan.scannedAt.toISOString(),
        scan.barcode || '',
        product?.name || '',
        product?.brand || '',
        product?.category || '',
        equiv?.molydalProduct?.name || '',
        equiv?.molydalProduct?.reference || '',
        equiv?.confidenceScore?.toString() || '',
        scan.status,
      ].map((v) => `"${v}"`).join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');
    return Buffer.from(csv, 'utf-8');
  }
}
