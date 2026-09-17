import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AdminFeedbackQueryDto, AdminPageDto } from './dto/admin-page.dto';
import { CompetitiveIntelligenceQueryDto } from './dto/competitive-intelligence-query.dto';

const AUTHOR = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
} as const;

export interface IntelligenceRow {
  brand: string;
  product: string | null;
  scanCount: number;
  userCount: number;
  matchedCount: number;
  noMatchCount: number;
  lastScanAt: Date;
}

@Injectable()
export class AdminInsightsService {
  constructor(private readonly prisma: PrismaService) {}

  async competitiveIntelligence(query: CompetitiveIntelligenceQueryDto) {
    if (query.from && query.to && query.from > query.to) {
      throw new BadRequestException(
        'La date de fin doit suivre la date de début.',
      );
    }
    const { page, pageSize, groupBy } = query;
    const filters: Prisma.Sql[] = [Prisma.sql`TRUE`];
    // Calendar days are evaluated in the business timezone, including DST.
    if (query.from)
      filters.push(
        Prisma.sql`s."scannedAt" >= ((${query.from}::date::timestamp AT TIME ZONE 'Europe/Paris') AT TIME ZONE 'UTC')`,
      );
    if (query.to)
      filters.push(
        Prisma.sql`s."scannedAt" < (((${query.to}::date + 1)::timestamp AT TIME ZONE 'Europe/Paris') AT TIME ZONE 'UTC')`,
      );
    const search = query.search?.trim();
    const searchFilter = search
      ? Prisma.sql`WHERE strpos(lower(brand || ' ' || product), lower(${search})) > 0`
      : Prisma.empty;
    // Aggregate in Postgres: the API only receives the requested page, never
    // a capped sample of scans. Include barcode scans through their product FK.
    const base = Prisma.sql`
      WITH identified AS (
        SELECT COALESCE(NULLIF(trim(s."identifiedBrand"), ''), NULLIF(trim(cp.brand), ''), 'Marque inconnue') AS brand,
          COALESCE(NULLIF(trim(s."identifiedName"), ''), NULLIF(trim(cp.name), '')) AS product,
          s."userId", s.status, s."scannedAt"
        FROM scans s LEFT JOIN competitor_products cp ON cp.id = s."competitorProductId"
        WHERE ${Prisma.join(filters, ' AND ')}
      ), filtered AS (
        SELECT *, lower(regexp_replace(brand, '\\s+', ' ', 'g')) AS brand_key,
          lower(regexp_replace(product, '\\s+', ' ', 'g')) AS product_key
        FROM identified WHERE product IS NOT NULL
      ), scoped AS (SELECT * FROM filtered ${searchFilter})`;
    const grouping =
      groupBy === 'brand'
        ? Prisma.sql`brand_key`
        : Prisma.sql`brand_key, product_key`;
    const productSelect =
      groupBy === 'brand' ? Prisma.sql`NULL::text` : Prisma.sql`min(product)`;
    const [rows, summaries] = await this.prisma.$transaction([
      this.prisma.$queryRaw<IntelligenceRow[]>(Prisma.sql`${base}
        SELECT min(brand) AS brand, ${productSelect} AS product,
          count(*)::int AS "scanCount", count(DISTINCT "userId")::int AS "userCount",
          count(*) FILTER (WHERE status = 'matched')::int AS "matchedCount",
          count(*) FILTER (WHERE status = 'no_match')::int AS "noMatchCount",
          max("scannedAt") AS "lastScanAt"
        FROM scoped GROUP BY ${grouping}
        ORDER BY "scanCount" DESC, ${grouping}
        LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`),
      this.prisma.$queryRaw<
        Array<{ scanCount: number; productCount: number; brandCount: number }>
      >(Prisma.sql`${base}
        SELECT count(*)::int AS "scanCount", count(DISTINCT (brand_key, product_key))::int AS "productCount",
          count(DISTINCT brand_key)::int AS "brandCount" FROM scoped`),
    ]);
    const summary = summaries[0] ?? {
      scanCount: 0,
      productCount: 0,
      brandCount: 0,
    };
    return {
      items: rows,
      total: groupBy === 'brand' ? summary.brandCount : summary.productCount,
      page,
      pageSize,
      groupBy,
      summary,
    };
  }

  async listScanFeedback(query: AdminFeedbackQueryDto) {
    const search = query.search?.trim();
    const where: Prisma.ScanEquivalentFeedbackWhereInput = {
      ...(query.vote ? { vote: query.vote } : {}),
      ...(search
        ? {
            OR: [
              {
                equivalentName: {
                  contains: search,
                  mode: 'insensitive' as const,
                },
              },
              {
                suggestedName: {
                  contains: search,
                  mode: 'insensitive' as const,
                },
              },
              {
                scan: {
                  identifiedName: {
                    contains: search,
                    mode: 'insensitive' as const,
                  },
                },
              },
              {
                scan: {
                  identifiedBrand: {
                    contains: search,
                    mode: 'insensitive' as const,
                  },
                },
              },
              {
                user: {
                  email: { contains: search, mode: 'insensitive' as const },
                },
              },
              {
                user: {
                  firstName: { contains: search, mode: 'insensitive' as const },
                },
              },
              {
                user: {
                  lastName: { contains: search, mode: 'insensitive' as const },
                },
              },
            ],
          }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.scanEquivalentFeedback.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        select: {
          id: true,
          createdAt: true,
          equivalentName: true,
          vote: true,
          suggestedName: true,
          user: { select: AUTHOR },
          scan: {
            select: {
              id: true,
              identifiedBrand: true,
              identifiedName: true,
              competitorProduct: { select: { brand: true, name: true } },
            },
          },
        },
      }),
      this.prisma.scanEquivalentFeedback.count({ where }),
    ]);
    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  async listConversationSubmissions(query: AdminFeedbackQueryDto) {
    const search = query.search?.trim();
    const where: Prisma.ConversationSubmissionWhereInput = search
      ? {
          OR: [
            {
              conversation: {
                title: { contains: search, mode: 'insensitive' },
              },
            },
            {
              conversation: {
                scannedName: { contains: search, mode: 'insensitive' },
              },
            },
            {
              conversation: {
                scannedBrand: { contains: search, mode: 'insensitive' },
              },
            },
            { user: { email: { contains: search, mode: 'insensitive' } } },
            { user: { firstName: { contains: search, mode: 'insensitive' } } },
            { user: { lastName: { contains: search, mode: 'insensitive' } } },
          ],
        }
      : {};
    const [items, total] = await this.prisma.$transaction([
      this.prisma.conversationSubmission.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        select: {
          id: true,
          createdAt: true,
          user: { select: AUTHOR },
          conversation: {
            select: {
              id: true,
              title: true,
              scannedName: true,
              scannedBrand: true,
              _count: { select: { messages: true } },
            },
          },
        },
      }),
      this.prisma.conversationSubmission.count({ where }),
    ]);
    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  async conversationSubmission(id: string, query: AdminPageDto) {
    const submission = await this.prisma.conversationSubmission.findUnique({
      where: { id },
      select: { id: true, conversationId: true },
    });
    if (!submission)
      throw new NotFoundException('Conversation transmise introuvable.');
    const where = { conversationId: submission.conversationId };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.aIMessage.findMany({
        where,
        orderBy: [{ timestamp: 'asc' }, { id: 'asc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        select: { id: true, role: true, text: true, timestamp: true },
      }),
      this.prisma.aIMessage.count({ where }),
    ]);
    return { items, total, page: query.page, pageSize: query.pageSize };
  }
}
