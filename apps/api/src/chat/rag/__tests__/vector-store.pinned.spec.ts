import { VectorStoreService } from '../vector-store.service';

describe('Exact active PIM product retrieval', () => {
  const unrelated = {
    product_name: 'OTHER', product_family: 'Greases', chunk_text: 'Unrelated FT',
    similarity: 0.95, metadata: {},
  };
  let prisma: any;
  let service: VectorStoreService;
  beforeEach(() => {
    prisma = {
      ragIndexVersion: { findFirst: jest.fn().mockResolvedValue({ id: 'active-v13' }) },
      ragChunk: { findMany: jest.fn().mockResolvedValue([
        { content: 'Original SOLESTER 550 FT', metadata: { source_kind: 'sellbase_technical_sheet' }, product: { name: 'SOLESTER 550', family: 'Oils' } },
        { content: 'Structured SOLESTER 550 data', metadata: { nsf_categories: [] }, product: { name: 'SOLESTER 550', family: 'Oils' } },
        { content: 'Original LCH 700 FT', metadata: { source_kind: 'sellbase_technical_sheet' }, product: { name: 'LCH 700', family: 'Greases' } },
      ]) },
    };
    service = new VectorStoreService({} as any, {} as any, prisma);
    jest.spyOn(service, 'searchChunks').mockResolvedValue([unrelated]);
  });

  it('puts the exact original FT and catalogue data before unrelated vector matches', async () => {
    const result = await service.dualSearch('And solester550?', 'synthetic lubricant', undefined, ['SOLESTER 550']);
    expect(result.slice(0, 2).map((chunk) => chunk.chunk_text)).toEqual([
      'Original SOLESTER 550 FT', 'Structured SOLESTER 550 data',
    ]);
    expect(result[0].metadata.exact_catalogue_match).toBe(true);
    expect(prisma.ragChunk.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: {
      indexId: 'active-v13', product: {
        active: true, productType: 'lubricant', name: { in: ['SOLESTER 550'] },
      },
    } }));
  });

  it('preserves hard filters when pinning exact names', async () => {
    const result = await service.dualSearch('SOLESTER 550', 'SOLESTER 550', { nsfCategory: 'H1' }, ['SOLESTER 550']);
    expect(result).toEqual([]);
  });

  it('does not query inactive or missing index versions', async () => {
    prisma.ragIndexVersion.findFirst.mockResolvedValue(null);
    const result = await service.dualSearch('SOLESTER 550', 'SOLESTER 550', undefined, ['SOLESTER 550']);
    expect(prisma.ragChunk.findMany).not.toHaveBeenCalled();
    expect(result.map((chunk) => chunk.product_name)).toEqual(['OTHER']);
  });
});
