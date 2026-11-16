import { ConfigService } from '@nestjs/config';
import { PimSyncService } from '../pim-sync.service';

jest.mock('../technical-sheet-text', () => ({
  technicalSheetText: jest.fn().mockResolvedValue('Viscosité de l’huile de base à 40°C : 775 cSt'),
}));

import { technicalSheetText } from '../technical-sheet-text';

function setup(documentsFor: (index: number) => Array<{ kind: string; language: string; fileName: string }>) {
  const products = Array.from({ length: 100 }, (_, index) => ({
    id: `product-${index}`, name: index === 0 ? 'MYE 716' : `PRODUCT ${index}`,
    family: 'TRAVAIL DES MÉTAUX', subfamily: null, shortDescription: null, description: null,
    usage: null, baseOil: null, thickener: null, nlgiGrade: null,
    viscosity40: null, baseOilViscosity40: null, temperatureMin: null,
    temperatureMax: null, dropPoint: null, dinClassification: null,
    isoClassification: null, foodGrade: false, ecoResponsible: false, moshMoahFree: false,
    productType: 'lubricant', rawData: {}, references: [],
    sellbaseInstanceId: 22009, documents: documentsFor(index),
  }));
  const prisma = {
    pimProduct: { findMany: jest.fn().mockResolvedValue(products) },
    ragIndexVersion: { findFirst: jest.fn().mockResolvedValue(null) },
    $executeRawUnsafe: jest.fn().mockResolvedValue(1),
  };
  const sellbase = {
    canDownloadDocument: jest.fn().mockReturnValue(true),
    downloadDocument: jest.fn().mockImplementation(async () => new Response('%PDF-fixture')),
  };
  const embeddings = { model: 'test', dimensions: 2, generateEmbedding: jest.fn().mockResolvedValue([0.1, 0.2]) };
  const service = new PimSyncService(prisma as any, sellbase as any, embeddings as any, new ConfigService());
  const ftInserts = () => prisma.$executeRawUnsafe.mock.calls.filter((call) => String(call[4]).includes('Original Sellbase technical sheet'));
  return { service, prisma, sellbase, ftInserts };
}

describe('PIM RAG original FT indexing', () => {
  beforeEach(() => (technicalSheetText as jest.Mock).mockResolvedValue('Viscosité de l’huile de base à 40°C : 775 cSt'));

  it('prefers the French FT and keeps its chunk unchanged when other languages exist', async () => {
    const { service, sellbase, ftInserts } = setup((index) => index === 0 ? [
      { kind: 'technical_sheet', language: 'en', fileName: 'MYE_716_EN.pdf' },
      { kind: 'technical_sheet', language: 'fr', fileName: 'MYE_716_FR.pdf' },
    ] : []);

    const result = await (service as any).buildIndex('new-index');

    expect(result).toMatchObject({ ftAvailable: 1, ftIndexed: 1 });
    expect(sellbase.downloadDocument).toHaveBeenCalledTimes(1);
    expect(sellbase.downloadDocument.mock.calls[0][0]).toBe('MYE_716_FR.pdf');
    const [insert] = ftInserts();
    expect(String(insert[4])).toContain('Original Sellbase technical sheet:\n');
    expect(JSON.parse(String(insert[6]))).not.toHaveProperty('source_language');
  });

  it('falls back to the English FT when no French FT exists', async () => {
    const { service, sellbase, ftInserts } = setup((index) => index === 0 ? [
      { kind: 'technical_sheet', language: 'de', fileName: 'MYE_716_DE.pdf' },
      { kind: 'technical_sheet', language: 'en', fileName: 'MYE_716_EN.pdf' },
    ] : []);

    const result = await (service as any).buildIndex('new-index');

    expect(result).toMatchObject({ ftAvailable: 1, ftIndexed: 1 });
    expect(sellbase.downloadDocument).toHaveBeenCalledWith('MYE_716_EN.pdf', {
      kind: 'technical_sheet', language: 'en', productInstanceId: 22009,
    });
    const [insert] = ftInserts();
    expect(String(insert[4])).toContain('Original Sellbase technical sheet (EN, no French FT available):');
    expect(JSON.parse(String(insert[6]))).toMatchObject({
      source_kind: 'sellbase_technical_sheet', source_file: 'MYE_716_EN.pdf', source_language: 'en',
    });
  });

  it('tries the next language when the French FT cannot be read', async () => {
    (technicalSheetText as jest.Mock)
      .mockRejectedValueOnce(new Error('Sellbase FT unavailable (404)'))
      .mockResolvedValue('Base oil viscosity at 40°C: 775 cSt');
    const { service, sellbase, ftInserts } = setup((index) => index === 0 ? [
      { kind: 'technical_sheet', language: 'fr', fileName: 'MYE_716_FR.pdf' },
      { kind: 'technical_sheet', language: 'de', fileName: 'MYE_716_DE.pdf' },
    ] : []);

    const result = await (service as any).buildIndex('new-index');

    expect(result).toMatchObject({ ftAvailable: 1, ftIndexed: 1 });
    expect(sellbase.downloadDocument.mock.calls.map((call) => call[0])).toEqual(['MYE_716_FR.pdf', 'MYE_716_DE.pdf']);
    expect(ftInserts()).toHaveLength(1);
    expect(JSON.parse(String(ftInserts()[0][6]))).toMatchObject({ source_language: 'de' });
  });

  it('counts a product once when every FT language fails', async () => {
    (technicalSheetText as jest.Mock).mockRejectedValue(new Error('Sellbase FT is not a PDF'));
    const { service, ftInserts } = setup((index) => index === 0 ? [
      { kind: 'technical_sheet', language: 'fr', fileName: 'A.pdf' },
      { kind: 'technical_sheet', language: 'en', fileName: 'B.pdf' },
    ] : []);

    const result = await (service as any).buildIndex('new-index');

    expect(result).toMatchObject({ ftAvailable: 1, ftIndexed: 0 });
    expect(ftInserts()).toHaveLength(0);
  });

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
