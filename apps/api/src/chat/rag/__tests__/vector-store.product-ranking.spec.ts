import { VectorStoreService } from '../vector-store.service';

const catalogue = (name: string, similarity: number, metadata: Record<string, unknown> = {}) => ({
  product_name: name, product_family: 'GRAISSES', chunk_text: `${name} catalogue fields`, similarity, metadata,
});
const sheet = (name: string, metadata: Record<string, unknown> = {}) => ({
  content: `${name} original FT: polyurea thickener, -30/+160°C`,
  metadata: { ...metadata, source_kind: 'sellbase_technical_sheet' },
  product: { name, family: 'GRAISSES' },
});
const catalogueRow = (name: string, metadata: Record<string, unknown> = {}) => ({
  content: `${name} catalogue fields`, metadata, product: { name, family: 'GRAISSES' },
});

describe('Product-level retrieval with original FT evidence', () => {
  let prisma: any;
  let service: VectorStoreService;

  beforeEach(() => {
    prisma = {
      ragIndexVersion: { findFirst: jest.fn().mockResolvedValue({ id: 'active' }) },
      ragChunk: { findMany: jest.fn().mockResolvedValue([
        catalogueRow('TGV 2000'), sheet('TGV 2000'),
        catalogueRow('LCH 250'), sheet('LCH 250'),
      ]) },
    };
    service = new VectorStoreService({} as any, {} as any, prisma);
    // Only the catalogue chunks were retrieved: the FTs ranked outside the window.
    jest.spyOn(service, 'searchChunks').mockResolvedValue([
      catalogue('LCH 250', 0.8), catalogue('TGV 2000', 0.7),
    ]);
  });

  it('adds the FT of every candidate, FT first, even when retrieval only matched the catalogue record', async () => {
    const result = await service.dualSearch('polyurea grease', 'polyurea grease');

    expect(result.map((chunk) => chunk.chunk_text)).toEqual([
      'LCH 250 original FT: polyurea thickener, -30/+160°C', 'LCH 250 catalogue fields',
      'TGV 2000 original FT: polyurea thickener, -30/+160°C', 'TGV 2000 catalogue fields',
    ]);
    expect(prisma.ragChunk.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: {
      indexId: 'active', product: { active: true, productType: 'lubricant', name: { in: ['LCH 250', 'TGV 2000'] } },
    } }));
  });

  it('ranks products on their best retrieved chunk and returns all their chunks', async () => {
    (service as any).cohereApiKey = 'key';
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      results: [{ index: 1, relevance_score: 0.9 }, { index: 0, relevance_score: 0.2 }],
    })));

    const result = await service.dualSearch('polyurea grease', 'polyurea grease');

    const body = JSON.parse(String(fetchMock.mock.calls[0][1]!.body));
    expect(body.documents).toEqual(['LCH 250 catalogue fields', 'TGV 2000 catalogue fields']);
    expect(result.map((chunk) => [chunk.product_name, chunk.similarity])).toEqual([
      ['TGV 2000', 0.9], ['TGV 2000', 0.9], ['LCH 250', 0.2], ['LCH 250', 0.2],
    ]);
    fetchMock.mockRestore();
  });

  it('keeps hard filters on loaded FT chunks', async () => {
    prisma.ragChunk.findMany.mockResolvedValue([
      catalogueRow('TGV 2000', { nsf_categories: [] }), sheet('TGV 2000', { nsf_categories: [] }),
      catalogueRow('LCH 250', { nsf_categories: ['H1'] }), sheet('LCH 250', { nsf_categories: ['H1'] }),
    ]);
    jest.spyOn(service, 'searchChunks').mockResolvedValue([
      catalogue('LCH 250', 0.8, { nsf_categories: ['H1'] }), catalogue('TGV 2000', 0.7, { nsf_categories: [] }),
    ]);

    const result = await service.dualSearch('food grease', 'food grease', { nsfCategory: 'H1' });

    expect([...new Set(result.map((chunk) => chunk.product_name))]).toEqual(['LCH 250']);
    expect(result).toHaveLength(2);
  });

  it('falls back to retrieved chunks when no PIM index is active', async () => {
    prisma.ragIndexVersion.findFirst.mockResolvedValue(null);

    const result = await service.dualSearch('polyurea grease', 'polyurea grease');

    expect(prisma.ragChunk.findMany).not.toHaveBeenCalled();
    expect(result.map((chunk) => chunk.chunk_text)).toEqual(['LCH 250 catalogue fields', 'TGV 2000 catalogue fields']);
  });
});
