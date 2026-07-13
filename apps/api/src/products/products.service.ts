import { Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SearchProductDto } from './dto/search-product.dto';
import { SellbaseClient } from '../pim/sellbase.client';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService, private sellbase: SellbaseClient) {}

  async findPimDocumentsByName(name: string) {
    const product = await this.prisma.pimProduct.findFirst({
      where: { name: { equals: name, mode: 'insensitive' }, active: true },
      include: { documents: { orderBy: [{ kind: 'asc' }, { language: 'asc' }] } },
    });
    if (!product) throw new NotFoundException('PIM product not found');
    return {
      product: { id: product.id, name: product.name },
      documents: product.documents.map((d) => ({ id: d.id, kind: d.kind, language: d.language, fileName: d.fileName, updatedAt: d.sourceUpdatedAt })),
    };
  }

  async downloadPimDocument(documentId: string) {
    const document = await this.prisma.pimDocument.findUnique({ where: { id: documentId }, include: { product: true } });
    if (!document || !document.product.active) throw new NotFoundException('Document not found');
    let upstream: Response;
    try { upstream = await this.sellbase.downloadDocument(document.fileName, { productInstanceId: document.product.sellbaseInstanceId, kind: document.kind, language: document.language }); }
    catch (error) { throw new ServiceUnavailableException(`Sellbase document service is not configured: ${error instanceof Error ? error.message : error}`); }
    if (!upstream.ok) throw new ServiceUnavailableException(`Sellbase document download failed (${upstream.status})`);
    return { buffer: Buffer.from(await upstream.arrayBuffer()), fileName: document.fileName, contentType: upstream.headers.get('content-type') ?? 'application/pdf' };
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
