import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProductsService } from '../products/products.service';
import { CreateScanDto } from './dto/create-scan.dto';
import { ScanFiltersDto } from './dto/scan-filters.dto';
import { ScanMethod, ScanStatus } from '@prisma/client';

@Injectable()
export class ScansService {
  constructor(
    private prisma: PrismaService,
    private productsService: ProductsService,
  ) {}

  async findAll(userId: string, filters: ScanFiltersDto) {
    const where: Record<string, unknown> = { userId };
    if (filters.status) where.status = filters.status;
    if (filters.method) where.scanMethod = filters.method;
    if (filters.from || filters.to) {
      where.scannedAt = {
        ...(filters.from && { gte: new Date(filters.from) }),
        ...(filters.to && { lte: new Date(filters.to) }),
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.scan.findMany({
        where,
        include: {
          competitorProduct: {
            include: {
              equivalences: {
                include: { molydalProduct: true },
                orderBy: { confidenceScore: 'desc' },
                take: 1,
              },
            },
          },
        },
        skip: filters.skip,
        take: filters.limit,
        orderBy: { scannedAt: 'desc' },
      }),
      this.prisma.scan.count({ where }),
    ]);

    return {
      data: data.map((scan) => this.formatScanRecord(scan)),
      meta: {
        total,
        page: filters.page,
        limit: filters.limit,
        totalPages: Math.ceil(total / filters.limit),
      },
    };
  }

  async findById(id: string, userId: string) {
    const scan = await this.prisma.scan.findFirst({
      where: { id, userId },
      include: {
        competitorProduct: {
          include: {
            equivalences: {
              include: { molydalProduct: true },
              orderBy: { confidenceScore: 'desc' },
              take: 1,
            },
          },
        },
      },
    });
    if (!scan) throw new NotFoundException('Scan not found');
    return this.formatScanRecord(scan);
  }

  async create(userId: string, dto: CreateScanDto) {
    let competitorProductId: string | null = null;
    let status: ScanStatus = ScanStatus.no_match;

    const product = await this.prisma.competitorProduct.findUnique({
      where: { barcode: dto.barcode },
      include: {
        equivalences: {
          include: { molydalProduct: true },
          orderBy: { confidenceScore: 'desc' },
          take: 1,
        },
      },
    });

    if (product) {
      competitorProductId = product.id;
      const equiv = product.equivalences[0];
      if (equiv) {
        status = equiv.confidenceScore >= 80 ? ScanStatus.matched : ScanStatus.partial;
      }
    }

    const scan = await this.prisma.scan.create({
      data: {
        barcode: dto.barcode,
        scanMethod: dto.scanMethod || ScanMethod.barcode,
        status,
        userId,
        competitorProductId,
        locationLat: dto.locationLat,
        locationLng: dto.locationLng,
        locationLabel: dto.locationLabel,
      },
      include: {
        competitorProduct: {
          include: {
            equivalences: {
              include: { molydalProduct: true },
              orderBy: { confidenceScore: 'desc' },
              take: 1,
            },
          },
        },
      },
    });

    return this.formatScanRecord(scan);
  }

  async createBatch(userId: string, dtos: CreateScanDto[]) {
    const results = [];
    for (const dto of dtos) {
      results.push(await this.create(userId, dto));
    }
    return results;
  }

  private formatScanRecord(scan: any) {
    const product = scan.competitorProduct;
    const equiv = product?.equivalences?.[0];

    return {
      id: scan.id,
      barcode: scan.barcode,
      scannedProduct: product
        ? {
            name: product.name,
            brand: product.brand,
            category: product.category,
            subcategory: product.subcategory,
            barcode: product.barcode,
          }
        : null,
      molydalMatch: equiv
        ? {
            id: equiv.molydalProduct.id,
            name: equiv.molydalProduct.name,
            reference: equiv.molydalProduct.reference,
            category: equiv.molydalProduct.category,
            confidence: equiv.confidenceScore,
            pricingTier: equiv.molydalProduct.pricingTier,
          }
        : null,
      status: scan.status,
      scannedAt: scan.scannedAt.toISOString(),
      scanMethod: scan.scanMethod,
      location:
        scan.locationLat != null
          ? { lat: scan.locationLat, lng: scan.locationLng, label: scan.locationLabel }
          : null,
      userId: scan.userId,
    };
  }
}
