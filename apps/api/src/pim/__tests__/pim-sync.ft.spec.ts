import { ConfigService } from '@nestjs/config';
import { PimSyncService } from '../pim-sync.service';

jest.mock('../technical-sheet-text', () => ({
  technicalSheetText: jest.fn().mockResolvedValue('Viscosité de l’huile de base à 40°C : 775 cSt'),
}));

describe('PIM RAG original FT indexing', () => {
  it('adds searchable original PDF evidence alongside the current catalogue record', async () => {
    const products = Array.from({ length: 100 }, (_, index) => ({
      id: `product-${index}`, name: index === 0 ? 'AGL 41 NF' : `PRODUCT ${index}`,
      family: 'GRAISSES', subfamily: null, shortDescription: null, description: null,
      usage: null, baseOil: null, thickener: null, nlgiGrade: null,
      viscosity40: null, baseOilViscosity40: null, temperatureMin: null,
      temperatureMax: null, dropPoint: null, dinClassification: null,
      isoClassification: null, foodGrade: false, ecoResponsible: false, moshMoahFree: false,
      productType: 'lubricant', rawData: {}, references: [],
      sellbaseInstanceId: 22009,
      documents: index === 0 ? [{ kind: 'technical_sheet', language: 'fr', fileName: 'AGL_41_NF_FT_FR.pdf' }] : [],
    }));
    const prisma = {
      pimProduct: { findMany: jest.fn().mockResolvedValue(products) },
      ragIndexVersion: { findFirst: jest.fn().mockResolvedValue(null) },
      $executeRawUnsafe: jest.fn().mockResolvedValue(1),
    };
    const sellbase = {
      canDownloadDocument: jest.fn().mockReturnValue(true),
      downloadDocument: jest.fn().mockResolvedValue(new Response('%PDF-fixture')),
    };
    const embeddings = { model: 'test', dimensions: 2, generateEmbedding: jest.fn().mockResolvedValue([0.1, 0.2]) };
    const service = new PimSyncService(prisma as any, sellbase as any, embeddings as any, new ConfigService());

    const result = await (service as any).buildIndex('new-index');

    expect(result).toEqual({ productCount: 100, chunkCount: 101, ftAvailable: 1, ftIndexed: 1 });
    expect(sellbase.downloadDocument).toHaveBeenCalledWith('AGL_41_NF_FT_FR.pdf', {
      kind: 'technical_sheet', language: 'fr', productInstanceId: 22009,
    });
    const pdfInsert = prisma.$executeRawUnsafe.mock.calls.find((call) => String(call[4]).includes('Original Sellbase technical sheet'));
    expect(pdfInsert).toBeDefined();
    expect(String(pdfInsert![4])).toContain('775 cSt');
    expect(JSON.parse(String(pdfInsert![6]))).toMatchObject({ source_kind: 'sellbase_technical_sheet', source_file: 'AGL_41_NF_FT_FR.pdf' });
  });
});
