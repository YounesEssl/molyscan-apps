import { VectorStoreService } from '../vector-store.service';

describe('PIM certification filters', () => {
  let service: VectorStoreService;
  beforeEach(() => {
    service = new VectorStoreService({} as any, {} as any);
    jest.spyOn(service, 'searchChunks').mockResolvedValue([
      { product_name: 'H1 GREASE', product_family: 'Grease', chunk_text: 'H1 grease', similarity: 0.9, metadata: { nsf_categories: ['H1'], food_grade: true } },
      { product_name: 'A1 CLEANER', product_family: 'Cleaner', chunk_text: 'A1 cleaner', similarity: 0.8, metadata: { nsf_categories: ['A1'], food_grade: false } },
      { product_name: 'UNKNOWN', product_family: 'Other', chunk_text: 'Unknown certification', similarity: 0.7, metadata: {} },
    ]);
  });
  test('keeps H1 grease and rejects A1 cleaners for the food lubricant constraint', async () => {
    expect((await service.dualSearch('grease', 'grease', { alimentaire: true })).map((p) => p.product_name)).toEqual(['H1 GREASE']);
  });
  test('retrieves certified A1 cleaners without substituting an H1 lubricant', async () => {
    expect((await service.dualSearch('cleaner', 'cleaner', { nsfCategory: 'A1' })).map((p) => p.product_name)).toEqual(['A1 CLEANER']);
  });
  test('a legacy generic food flag never proves A1 certification', async () => {
    jest.spyOn(service, 'searchChunks').mockResolvedValue([{ product_name: 'LEGACY', product_family: 'Other', chunk_text: 'Legacy', similarity: 0.8, metadata: { alimentaire: true } }]);
    expect(await service.dualSearch('cleaner', 'cleaner', { nsfCategory: 'A1' })).toEqual([]);
    expect(await service.dualSearch('grease', 'grease', { alimentaire: true })).toHaveLength(1);
  });
  test('an explicit absence of NSF certification overrides a generic food-grade flag', async () => {
    jest.spyOn(service, 'searchChunks').mockResolvedValue([{ product_name: 'OTHER CERTIFIER', product_family: 'Grease', chunk_text: 'H1 with another certifier', similarity: 0.8, metadata: { nsf_categories: [], food_grade: true } }]);
    expect(await service.dualSearch('grease', 'grease', { nsfCategory: 'H1' })).toEqual([]);
  });
});
