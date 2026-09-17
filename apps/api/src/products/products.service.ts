import { Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SearchProductDto } from './dto/search-product.dto';
import { SellbaseClient, type SellbaseDatum } from '../pim/sellbase.client';
import { documents as normalizeDocuments } from '../pim/pim.normalizer';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService, private sellbase: SellbaseClient) {}

  async findPimDocumentsByName(name: string) {
    const normalizedName = normalizeProductName(name);
    // Match punctuation/spacing variants, but never fuzzy-match a different grade.
    const candidates = await this.prisma.pimProduct.findMany({
      where: { active: true }, select: { id: true, name: true },
    });
    const matches = candidates.filter((p) => normalizeProductName(p.name) === normalizedName);
    if (matches.length !== 1) throw new NotFoundException('PIM product not found or ambiguous');
    const product = await this.prisma.pimProduct.findUnique({
      where: { id: matches[0].id },
      include: {
        documents: { orderBy: [{ kind: 'asc' }, { language: 'asc' }] },
        references: { where: { active: true }, orderBy: { code: 'asc' } },
      },
    });
    if (!product?.active) throw new NotFoundException('PIM product not found');
    const documents = product.documents.map((d) => ({
      id: d.id, kind: d.kind, language: d.language, fileName: d.fileName,
      updatedAt: d.sourceUpdatedAt, referenceCode: null as string | null,
      available: this.sellbase.canDownloadDocument(d.kind, product.sellbaseInstanceId),
    }));
    const seen = new Set(documents.map((d) => `${d.kind}:${d.language}:${d.fileName}`));
    for (const reference of product.references) {
      for (const doc of normalizeDocuments(reference.rawData as Record<string, SellbaseDatum>)) {
        if (doc.kind !== 'safety_sheet') continue;
        const key = `${doc.kind}:${doc.language}:${doc.fileName}`;
        if (seen.has(key)) continue;
        seen.add(key);
        documents.push({
          id: `ref_${reference.id}_${doc.sellbaseCaracId}`,
          kind: doc.kind, language: doc.language, fileName: doc.fileName,
          updatedAt: doc.sourceUpdatedAt, referenceCode: reference.code,
          available: this.sellbase.canDownloadDocument(doc.kind, product.sellbaseInstanceId),
        });
      }
    }
    return { product: { id: product.id, name: product.name }, documents };
  }

  async downloadPimDocument(documentId: string) {
    const document = await this.resolvePimDocument(documentId);
    if (!document || !document.product.active) throw new NotFoundException('Document not found');
    if (!this.sellbase.canDownloadDocument(document.kind, document.product.sellbaseInstanceId)) {
      throw new ServiceUnavailableException('Document access is not configured');
    }
    try {
      const upstream = await this.sellbase.downloadDocument(document.fileName, {
        productInstanceId: document.product.sellbaseInstanceId,
        kind: document.kind, language: document.language,
      });
      if (!upstream.ok) throw new Error(`Upstream status ${upstream.status}`);
      const maxSize = 20 * 1024 * 1024;
      if (/text\/html|application\/xhtml\+xml/i.test(upstream.headers.get('content-type') ?? '')
        || Number(upstream.headers.get('content-length')) > maxSize || !upstream.body) {
        await upstream.body?.cancel();
        throw new Error('Invalid document size');
      }
      const reader = upstream.body.getReader();
      const chunks: Buffer[] = [];
      let size = 0;
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.length;
          if (size > maxSize) throw new Error('Document exceeds size limit');
          chunks.push(Buffer.from(value));
        }
      } finally {
        await reader.cancel().catch(() => undefined);
      }
      const buffer = Buffer.concat(chunks);
      // Molydal can return its HTML error page with HTTP 200; reject it before
      // the mobile client saves it with a .pdf extension.
      if (!buffer.subarray(0, 5).equals(Buffer.from('%PDF-'))) {
        throw new Error('Upstream did not return a PDF');
      }
      const fileName = document.fileName.split(/[\\/]/).pop() || 'document.pdf';
      return { buffer, fileName, contentType: 'application/pdf' };
    } catch {
      throw new ServiceUnavailableException('Document temporarily unavailable. Please try again later.');
    }
  }

  private async resolvePimDocument(documentId: string) {
    const ref = /^ref_([a-f0-9-]{36})_(\d+)$/i.exec(documentId);
    if (ref) {
      const reference = await this.prisma.pimReference.findUnique({ where: { id: ref[1] }, include: { product: true } });
      if (!reference?.active || !reference.product.active) return null;
      const doc = normalizeDocuments(reference.rawData as Record<string, SellbaseDatum>)
        .find((d) => d.kind === 'safety_sheet' && d.sellbaseCaracId === Number(ref[2]));
      return doc ? { ...doc, product: reference.product } : null;
    }
    return this.prisma.pimDocument.findUnique({ where: { id: documentId }, include: { product: true } });
  }

  async findByBarcode(barcode: string) {
    const product = await this.prisma.competitorProduct.findUnique({
      where: { barcode },
      include: {
        equivalences: {
          include: { molydalProduct: true },
          orderBy: { confidenceScore: 'desc' },
          take: 1,
        },
      },
    });

    if (!product) throw new NotFoundException('Product not found for this barcode');

    const equivalence = product.equivalences[0] || null;
    return {
      competitorProduct: {
        name: product.name,
        brand: product.brand,
        category: product.category,
        subcategory: product.subcategory,
        barcode: product.barcode,
      },
      molydalMatch: equivalence
        ? {
            id: equivalence.molydalProduct.id,
            name: equivalence.molydalProduct.name,
            reference: equivalence.molydalProduct.reference,
            category: equivalence.molydalProduct.category,
            confidence: equivalence.confidenceScore,
            pricingTier: equivalence.molydalProduct.pricingTier,
          }
        : null,
      status: equivalence
        ? equivalence.confidenceScore >= 80
          ? 'matched'
          : 'partial'
        : 'no_match',
    };
  }

  async search(dto: SearchProductDto) {
    const where: Record<string, unknown> = {};
    if (dto.q) {
      where.OR = [
        { name: { contains: dto.q, mode: 'insensitive' } },
        { brand: { contains: dto.q, mode: 'insensitive' } },
      ];
    }
    if (dto.category) where.category = { contains: dto.category, mode: 'insensitive' };
    if (dto.brand) where.brand = { contains: dto.brand, mode: 'insensitive' };

    const [data, total] = await Promise.all([
      this.prisma.competitorProduct.findMany({
        where,
        include: {
          equivalences: {
            include: { molydalProduct: true },
            orderBy: { confidenceScore: 'desc' },
            take: 1,
          },
        },
        skip: dto.skip,
        take: dto.limit,
        orderBy: { name: 'asc' },
      }),
      this.prisma.competitorProduct.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page: dto.page,
        limit: dto.limit,
        totalPages: Math.ceil(total / dto.limit),
      },
    };
  }

  async findById(id: string) {
    const product = await this.prisma.competitorProduct.findUnique({
      where: { id },
      include: {
        equivalences: {
          include: { molydalProduct: true },
          orderBy: { confidenceScore: 'desc' },
          take: 1,
        },
      },
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }
}

export function normalizeProductName(value: string): string {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}
