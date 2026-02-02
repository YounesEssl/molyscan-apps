import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import Tesseract from 'tesseract.js';

@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);

  constructor(private prisma: PrismaService) {}

  async analyze(imageBuffer: Buffer) {
    // Run OCR with Tesseract
    let extractedText = '';
    try {
      const result = await Tesseract.recognize(imageBuffer, 'fra', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            this.logger.debug(`OCR progress: ${Math.round((m.progress || 0) * 100)}%`);
          }
        },
      });
      extractedText = result.data.text.trim();
    } catch (error) {
      this.logger.error(`OCR failed: ${error}`);
      return { extractedText: '', detectedProduct: null };
    }

    // Try to match a competitor product
    let detectedProduct = null;
    if (extractedText) {
      const products = await this.prisma.competitorProduct.findMany({
        include: {
          equivalences: {
            include: { molydalProduct: true },
            orderBy: { confidenceScore: 'desc' },
            take: 1,
          },
        },
      });

      const textLower = extractedText.toLowerCase();
      for (const product of products) {
        if (
          textLower.includes(product.name.toLowerCase()) ||
          textLower.includes(product.brand.toLowerCase())
        ) {
          const equiv = product.equivalences[0];
          detectedProduct = {
            competitorProduct: {
              name: product.name,
              brand: product.brand,
              category: product.category,
              barcode: product.barcode,
            },
            molydalMatch: equiv
              ? {
                  id: equiv.molydalProduct.id,
                  name: equiv.molydalProduct.name,
                  reference: equiv.molydalProduct.reference,
                  confidence: equiv.confidenceScore,
                }
              : null,
          };
          break;
        }
      }
    }

    return { extractedText, detectedProduct };
  }
}
