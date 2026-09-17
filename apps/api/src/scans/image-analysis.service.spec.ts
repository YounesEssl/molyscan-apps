import { ImageAnalysisService } from './image-analysis.service';

const mockGenerateContent = jest.fn();
jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: () => ({ generateContent: mockGenerateContent }),
  })),
}));

describe('Scan equivalence integrity', () => {
  const identified = { name: 'Competitor 68', brand: 'Brand', type: 'oil', specs: 'ISO 68' };
  let service: ImageAnalysisService;
  let prisma: any;
  let vector: any;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = {
      scan: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn().mockResolvedValue({ id: 'scan' }) },
      expertEquivalence: { findUnique: jest.fn().mockResolvedValue(null) },
    };
    vector = { dualSearch: jest.fn().mockResolvedValue([]) };
    service = new ImageAnalysisService(
      { getOrThrow: () => 'test-key' } as any, prisma,
      { reformulateQuery: jest.fn().mockResolvedValue('oil ISO 68') } as any,
      vector, { upload: jest.fn() } as any,
    );
    jest.spyOn(service as any, 'identifyProduct').mockResolvedValue(identified);
  });

  test('current expert correction wins over a historical AI guess', async () => {
    prisma.scan.findMany.mockResolvedValue([{ equivalentsJson: [{ name: 'OLD WRONG PRODUCT' }] }]);
    prisma.expertEquivalence.findUnique.mockResolvedValue({ molydalEquivalent: 'H 125 AL', confidence: 100, noEquivalent: false });
    const result = await service.analyzeImage('AA==', 'image/jpeg', 'user');
    expect(result.equivalents[0].name).toBe('H 125 AL');
    expect(prisma.scan.findMany).not.toHaveBeenCalled();
    expect(vector.dualSearch).not.toHaveBeenCalled();
  });

  test('expert no-equivalent decision is persisted without a product or model fallback', async () => {
    prisma.expertEquivalence.findUnique.mockResolvedValue({ noEquivalent: true, molydalEquivalent: '', confidence: 0 });
    const result = await service.analyzeImage('AA==', 'image/jpeg', 'user');
    expect(result.equivalents).toEqual([]);
    expect(result.analysis).toContain('pas d’équivalent');
    expect(prisma.scan.create).toHaveBeenCalledWith({ data: expect.objectContaining({ status: 'no_match', molydalEquivalent: null, equivalentsJson: [] }) });
    expect(vector.dualSearch).not.toHaveBeenCalled();
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });

  test('empty retrieval does not ask a model to invent an equivalent', async () => {
    const result = await service.analyzeImage('AA==', 'image/jpeg', 'user');
    expect(result.equivalents).toEqual([]);
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });

  test('an idempotency key cannot expose another user’s scan', async () => {
    prisma.scan.findUnique.mockResolvedValue({ id: 'other-scan', userId: 'other-user' });
    await expect(service.analyzeImage('AA==', 'image/jpeg', 'user', undefined, undefined, 'request')).rejects.toThrow('already exists');
  });

  test.each([
    { equivalents: [{ name: 'INVENTED', family: 'Oil', compatibility: 99, reason: 'invented' }], analysis: 'INVENTED is best' },
    { equivalents: [{ name: 'H 125 AL', family: 'Oil', compatibility: '99', reason: 'invalid' }], analysis: 'invalid' },
    { equivalents: [{ name: 'H 125 AL', family: 'Oil', compatibility: 101, reason: 'invalid' }], analysis: 'invalid' },
    { equivalents: { name: 'H 125 AL' }, analysis: 'invalid' },
    { equivalents: [], analysis: 'INVENTED is best' },
  ])('rejects ungrounded or malformed output without leaking its prose: %j', async (payload) => {
    mockGenerateContent.mockResolvedValue({ response: { text: () => JSON.stringify(payload) } });
    const result = await (service as any).generateEquivalenceAnalysis(identified, 'datasheet', ['H 125 AL']);
    expect(result.equivalents).toEqual([]);
    expect(result.analysis).not.toContain('INVENTED');
    expect(result.analysis).not.toBe('invalid');
  });

  test('canonicalizes source names and ranks valid candidates before truncation', async () => {
    mockGenerateContent.mockResolvedValue({ response: { text: () => JSON.stringify({
      equivalents: [
        { name: 'h-125 al', family: 'Oil', compatibility: 80, reason: 'Datasheet confirms application' },
        { name: 'USAGOL AL', family: 'Oil', compatibility: 95, reason: 'Datasheet confirms application and viscosity' },
      ], analysis: 'Both datasheets support the application.',
    }) } });
    const result = await (service as any).generateEquivalenceAnalysis(identified, 'datasheet', ['H 125 AL', 'USAGOL AL']);
    expect(result.equivalents.map((entry: any) => entry.name)).toEqual(['USAGOL AL', 'H 125 AL']);
  });
});
