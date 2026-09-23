import { ProductsService } from '../products.service';
import { SearchProductDto } from '../dto/search-product.dto';

describe('Legacy catalogue availability against the current PIM', () => {
  const mapping = (name: string, reference: string, confidenceScore = 95) => ({
    confidenceScore, molydalProduct: { id: reference, name, reference, category: 'Cleaner', pricingTier: 'standard' },
  });
  let prisma: any;
  let service: ProductsService;
  let product: any;

  beforeEach(() => {
    product = { id: 'competitor', name: 'Competitor cleaner', barcode: '123', brand: 'Brand', category: 'Cleaner', equivalences: [] };
    prisma = {
      competitorProduct: {
        findUnique: jest.fn().mockImplementation(async () => product),
        findMany: jest.fn().mockImplementation(async () => [product]), count: jest.fn().mockResolvedValue(1),
      },
      pimProduct: { findMany: jest.fn().mockResolvedValue([
        { name: 'STARNET', active: false, references: [] },
        { name: 'STARNET+', active: true, references: [{ code: 'OLD25L', active: false }, { code: 'NEW5L', active: true }] },
        { name: 'KL BIO', active: false, references: [] }, { name: 'KL BIO', active: true, references: [] },
      ]) },
    };
    service = new ProductsService(prisma, {} as any);
  });

  it.each([
    ['STARNET', 'UNKNOWN'], ['STARNET+', 'OLD25L'],
  ])('does not recommend known inactive product/reference %s/%s for a new barcode lookup', async (name, reference) => {
    product.equivalences = [mapping(name, reference)];
    expect(await service.findByBarcode('123')).toMatchObject({ status: 'no_match', molydalMatch: null });
    expect(product.equivalences).toHaveLength(1);
  });

  it('falls through an unavailable highest-ranked mapping to the next valid candidate', async () => {
    product.equivalences = [mapping('STARNET+', 'OLD25L', 100), mapping('STARNET+', 'NEW5L', 90)];
    expect(await service.findByBarcode('123')).toMatchObject({ status: 'matched', molydalMatch: { name: 'STARNET+', reference: 'NEW5L', confidence: 90 } });
    expect(prisma.competitorProduct.findUnique.mock.calls[0][0].include.equivalences.take).toBeUndefined();
    expect(product.equivalences[0].molydalProduct.reference).toBe('OLD25L');
  });

  it.each([['KL BIO', 'UNKNOWN'], ['UNCATALOGUED EXPERT PRODUCT', 'UNKNOWN'], ['STARNET+', 'NEW5L']])(
    'preserves active homonyms, plus grades and unknown mappings %s/%s', async (name, reference) => {
      product.equivalences = [mapping(name, reference)];
      expect(await service.findByBarcode('123')).toMatchObject({ molydalMatch: { name, reference } });
    },
  );

  it('filters search suggestions without deleting competitors, changing totals or mutating saved mappings', async () => {
    product.equivalences = [mapping('STARNET+', 'OLD25L')];
    const result = await service.search(new SearchProductDto());
    expect(result.data).toEqual([{ ...product, equivalences: [] }]);
    expect(result.meta.total).toBe(1);
    expect(product.equivalences).toHaveLength(1);
  });

  it('filters direct product detail and preserves only the best currently available mapping', async () => {
    product.equivalences = [mapping('STARNET', 'OLD', 100), mapping('STARNET+', 'NEW5L', 90), mapping('KL BIO', 'OTHER', 80)];
    const result = await service.findById('competitor');
    expect(result.equivalences).toEqual([product.equivalences[1]]);
    expect(product.equivalences).toHaveLength(3);
  });
});
