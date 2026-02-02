import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SearchProductDto } from './dto/search-product.dto';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

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
