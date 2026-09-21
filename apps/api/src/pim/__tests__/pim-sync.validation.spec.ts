import { PimSyncService } from '../pim-sync.service';

describe('PIM index validation', () => {
  test('validates against the same 40-candidate window used by production retrieval', async () => {
    const prisma = {
      $queryRawUnsafe: jest.fn()
        .mockResolvedValueOnce([{ name: 'LUB 19' }])
        .mockResolvedValueOnce([{ name: 'TGV 2000' }])
        .mockResolvedValueOnce([{ name: 'H 125 AL' }])
        .mockResolvedValueOnce([{ name: 'MYE 615 AL' }])
        .mockResolvedValueOnce([{ name: 'SOLESTER 77' }]),
    };
    const embeddings = {
      generateEmbedding: jest.fn().mockResolvedValue([0.1, 0.2]),
    };
    const service = new PimSyncService(
      prisma as any,
      {} as any,
      embeddings as any,
      {} as any,
    );

    const result = await (service as any).validateIndex('index-1');

    expect(result).toMatchObject({ passed: 5, total: 5 });
    expect(prisma.$queryRawUnsafe).toHaveBeenCalledTimes(5);
    for (const [query] of prisma.$queryRawUnsafe.mock.calls) {
      expect(query).toContain('LIMIT 40');
    }
  });
});
