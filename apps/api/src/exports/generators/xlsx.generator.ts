import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';

@Injectable()
export class XlsxGenerator {
  async generate(scans: any[]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Scans');

    sheet.columns = [
      { header: 'Date', key: 'date', width: 20 },
      { header: 'Barcode', key: 'barcode', width: 18 },
      { header: 'Produit concurrent', key: 'product', width: 30 },
      { header: 'Marque', key: 'brand', width: 18 },
      { header: 'Catégorie', key: 'category', width: 22 },
      { header: 'Équivalent Molydal', key: 'molydal', width: 30 },
      { header: 'Référence', key: 'reference', width: 16 },
      { header: 'Confiance (%)', key: 'confidence', width: 14 },
      { header: 'Statut', key: 'status', width: 12 },
    ];

    // Style header
    sheet.getRow(1).font = { bold: true };

    for (const scan of scans) {
      const product = scan.competitorProduct;
      const equiv = product?.equivalences?.[0];
      sheet.addRow({
        date: scan.scannedAt.toISOString(),
        barcode: scan.barcode || '',
        product: product?.name || '',
        brand: product?.brand || '',
        category: product?.category || '',
        molydal: equiv?.molydalProduct?.name || '',
        reference: equiv?.molydalProduct?.reference || '',
        confidence: equiv?.confidenceScore || '',
        status: scan.status,
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
