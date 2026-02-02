import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';

@Injectable()
export class PdfGenerator {
  async generate(scans: any[]): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.fontSize(20).fillColor('#1B3A5C').text('MolyScan — Rapport de Scans', { align: 'center' });
      doc.moveDown();
      doc.fontSize(10).fillColor('#64748B').text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, { align: 'center' });
      doc.moveDown(2);

      // Stats
      const matched = scans.filter((s) => s.status === 'matched').length;
      const partial = scans.filter((s) => s.status === 'partial').length;
      const noMatch = scans.filter((s) => s.status === 'no_match').length;

      doc.fontSize(12).fillColor('#1B3A5C').text(`Total: ${scans.length} scans`);
      doc.fontSize(10).fillColor('#10B981').text(`Correspondances: ${matched}`);
      doc.fillColor('#F59E0B').text(`Partielles: ${partial}`);
      doc.fillColor('#EF4444').text(`Sans correspondance: ${noMatch}`);
      doc.moveDown(2);

      // Table
      for (const scan of scans) {
        const product = scan.competitorProduct;
        const equiv = product?.equivalences?.[0];

        doc.fontSize(10).fillColor('#1B3A5C')
          .text(`${product?.name || 'N/A'} (${product?.brand || ''})`, { continued: true })
          .fillColor('#64748B')
          .text(` → ${equiv?.molydalProduct?.name || 'Aucun équivalent'}`);

        doc.fontSize(8).fillColor('#94A3B8')
          .text(`  Barcode: ${scan.barcode || 'N/A'} | Statut: ${scan.status} | Date: ${scan.scannedAt.toISOString().split('T')[0]}`);
        doc.moveDown(0.5);

        if (doc.y > 700) doc.addPage();
      }

      doc.end();
    });
  }
}
