import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { PrismaService } from '../prisma/prisma.service';
import { AdminInsightsService } from './admin-insights.service';
import { CompetitiveIntelligenceQueryDto } from './dto/competitive-intelligence-query.dto';
import { AdminFeedbackQueryDto, AdminPageDto } from './dto/admin-page.dto';

// Opt in with a disposable database only. Do not fall back to DATABASE_URL.
const databaseUrl = process.env.ADMIN_TEST_DATABASE_URL;
const integration = databaseUrl ? describe : describe.skip;

integration('Admin insights with PostgreSQL', () => {
  const prisma = new PrismaService({
    datasources: { db: { url: databaseUrl ?? 'postgresql://unused' } },
  });
  const service = new AdminInsightsService(prisma);
  const marker = `qa-admin-${randomUUID()}`;
  const userId = randomUUID();
  const secondUserId = randomUUID();
  const productId = randomUUID();
  const scanId = randomUUID();
  const conversationId = randomUUID();
  const submissionId = randomUUID();
  const query = (overrides: object = {}) =>
    plainToInstance(CompetitiveIntelligenceQueryDto, {
      from: '2026-03-29',
      to: '2026-03-29',
      search: marker,
      ...overrides,
    });

  beforeAll(async () => {
    await prisma.user.createMany({
      data: [userId, secondUserId].map((id, i) => ({
        id,
        email: `${marker}-${i}@example.test`,
        passwordHash: 'test-only',
        firstName: 'QA',
        lastName: `Auteur ${i}`,
        role: 'admin',
        status: 'approved',
      })),
    });
    await prisma.competitorProduct.create({
      data: {
        id: productId,
        barcode: marker,
        brand: marker,
        name: 'Product B',
        category: 'test',
      },
    });
    await prisma.scan.createMany({
      data: [
        {
          id: scanId,
          userId,
          status: 'matched',
          identifiedBrand: marker,
          identifiedName: 'Product A',
          scannedAt: new Date('2026-03-28T23:00:00Z'),
        },
        {
          userId,
          status: 'matched',
          identifiedBrand: marker.toUpperCase(),
          identifiedName: ' product  a ',
          scannedAt: new Date('2026-03-29T12:00:00Z'),
        },
        {
          userId: secondUserId,
          status: 'no_match',
          identifiedBrand: marker,
          identifiedName: 'Product A',
          scannedAt: new Date('2026-03-29T21:59:59Z'),
        },
        {
          userId,
          status: 'partial',
          competitorProductId: productId,
          scannedAt: new Date('2026-03-29T15:00:00Z'),
        },
        {
          userId,
          status: 'matched',
          identifiedBrand: marker,
          identifiedName: 'Before',
          scannedAt: new Date('2026-03-28T22:59:59Z'),
        },
        {
          userId,
          status: 'matched',
          identifiedBrand: marker,
          identifiedName: 'After',
          scannedAt: new Date('2026-03-29T22:00:00Z'),
        },
        {
          userId,
          status: 'no_match',
          identifiedBrand: marker,
          scannedAt: new Date('2026-03-29T12:00:00Z'),
        },
      ],
    });
    await prisma.scanEquivalentFeedback.create({
      data: { scanId, userId, equivalentName: 'Example', vote: 'down' },
    });
    await prisma.aIConversation.create({
      data: { id: conversationId, userId, title: marker },
    });
    await prisma.conversationSubmission.create({
      data: { id: submissionId, conversationId, userId },
    });
    await prisma.aIMessage.createMany({
      data: ['user', 'assistant'].map((role, index) => ({
        conversationId,
        role,
        text: `Message ${index}`,
        sources: [],
        timestamp: new Date(`2026-03-29T12:0${index}:00Z`),
      })),
    });
  });

  afterAll(async () => {
    await prisma.conversationSubmission.deleteMany({
      where: { id: submissionId },
    });
    await prisma.aIMessage.deleteMany({ where: { conversationId } });
    await prisma.aIConversation.deleteMany({ where: { id: conversationId } });
    await prisma.scan.deleteMany({
      where: { userId: { in: [userId, secondUserId] } },
    });
    await prisma.competitorProduct.deleteMany({ where: { id: productId } });
    await prisma.user.deleteMany({
      where: { id: { in: [userId, secondUserId] } },
    });
    await prisma.$disconnect();
  });

  it('counts the full Paris calendar day across DST, groups case/whitespace and includes barcode scans', async () => {
    const result = await service.competitiveIntelligence(
      query({ pageSize: 1 }),
    );
    expect(result.summary).toEqual({
      scanCount: 4,
      productCount: 2,
      brandCount: 1,
    });
    expect(result.total).toBe(2);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      scanCount: 3,
      userCount: 2,
      matchedCount: 2,
      noMatchCount: 1,
    });
    const second = await service.competitiveIntelligence(
      query({ pageSize: 1, page: 2 }),
    );
    expect(second.items[0]).toMatchObject({
      product: 'Product B',
      scanCount: 1,
    });
    const brand = await service.competitiveIntelligence(
      query({ groupBy: 'brand' }),
    );
    expect(brand.total).toBe(1);
    expect(brand.items[0]).toMatchObject({
      product: null,
      scanCount: 4,
      userCount: 2,
    });
  });

  it('keeps totals for a page beyond the results and treats SQL-like search literally', async () => {
    expect(
      await service.competitiveIntelligence(query({ page: 5, pageSize: 1 })),
    ).toMatchObject({ items: [], total: 2, summary: { scanCount: 4 } });
    expect(
      await service.competitiveIntelligence(
        query({ search: `${marker}' OR TRUE --` }),
      ),
    ).toMatchObject({ items: [], total: 0 });
  });

  it('keeps Paris day boundaries when the database session has a different timezone', async () => {
    const inNewYork = new AdminInsightsService({
      $queryRaw: prisma.$queryRaw.bind(prisma),
      $transaction: (operations: Prisma.PrismaPromise<unknown>[]) =>
        prisma
          .$transaction([
            prisma.$executeRaw`SET LOCAL TIME ZONE 'America/New_York'`,
            ...operations,
          ])
          .then((results) => results.slice(1)),
    } as unknown as PrismaService);
    const result = await inNewYork.competitiveIntelligence(query());
    expect(result.summary).toEqual({
      scanCount: 4,
      productCount: 2,
      brandCount: 1,
    });
  });

  it('shows authors and negative feedback without a suggested product', async () => {
    const result = await service.listScanFeedback(
      plainToInstance(AdminFeedbackQueryDto, { search: marker, vote: 'down' }),
    );
    expect(result.total).toBe(1);
    expect(result.items[0]).toMatchObject({
      suggestedName: null,
      vote: 'down',
      user: { id: userId },
      scan: { id: scanId },
    });
  });

  it('shows the submission author and paginates the complete conversation', async () => {
    const result = await service.listConversationSubmissions(
      plainToInstance(AdminFeedbackQueryDto, { search: marker }),
    );
    expect(result.items[0]).toMatchObject({
      id: submissionId,
      user: { id: userId },
      conversation: { _count: { messages: 2 } },
    });
    const messages = await service.conversationSubmission(
      submissionId,
      plainToInstance(AdminPageDto, { pageSize: 1, page: 2 }),
    );
    expect(messages.total).toBe(2);
    expect(messages.items[0]).toMatchObject({
      role: 'assistant',
      text: 'Message 1',
    });
  });
});
