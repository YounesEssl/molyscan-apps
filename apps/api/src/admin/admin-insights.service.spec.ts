import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AdminFeedbackQueryDto } from './dto/admin-page.dto';
import { CompetitiveIntelligenceQueryDto } from './dto/competitive-intelligence-query.dto';
import { AdminInsightsService } from './admin-insights.service';
import { PrismaService } from '../prisma/prisma.service';

describe('Admin insight query validation', () => {
  it.each([
    { groupBy: 'sql' },
    { page: 0 },
    { pageSize: 101 },
    { from: '2026-02-31' },
    { to: '2026-09-16T12:00:00Z' },
  ])('rejects invalid query %j', async (query) => {
    expect(
      (await validate(plainToInstance(CompetitiveIntelligenceQueryDto, query)))
        .length,
    ).toBeGreaterThan(0);
  });

  it('bounds pagination while accepting calendar dates', async () => {
    const dto = plainToInstance(CompetitiveIntelligenceQueryDto, {
      from: '2026-03-29',
      to: '2026-03-29',
      page: '2',
      pageSize: '25',
      groupBy: 'brand',
    });
    expect(await validate(dto)).toEqual([]);
    expect(dto.page).toBe(2);
  });

  it('rejects inverted periods before querying the database', async () => {
    const service = new AdminInsightsService({} as PrismaService);
    await expect(
      service.competitiveIntelligence(
        plainToInstance(CompetitiveIntelligenceQueryDto, {
          from: '2026-04-01',
          to: '2026-03-29',
        }),
      ),
    ).rejects.toThrow('La date de fin doit suivre la date de début.');
  });

  it('bounds and validates feedback filters', async () => {
    expect(
      (
        await validate(
          plainToInstance(AdminFeedbackQueryDto, {
            pageSize: 1000,
            vote: 'wrong',
          }),
        )
      ).map((error) => error.property),
    ).toEqual(expect.arrayContaining(['pageSize', 'vote']));
  });
});
