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
  let scanEmailNotification: any;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = {
      scan: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn().mockResolvedValue({ id: 'scan' }) },
      expertEquivalence: { findUnique: jest.fn().mockResolvedValue(null) },
      pimProduct: { findMany: jest.fn().mockResolvedValue([]) },
    };
    vector = { dualSearch: jest.fn().mockResolvedValue([]) };
    scanEmailNotification = { notifyCompletedScan: jest.fn().mockResolvedValue(undefined) };
    service = new ImageAnalysisService(
      { getOrThrow: () => 'test-key' } as any, prisma,
      { reformulateQuery: jest.fn().mockResolvedValue('oil ISO 68') } as any,
      vector, { upload: jest.fn() } as any, scanEmailNotification,
    );
    jest.spyOn(service as any, 'identifyProduct').mockResolvedValue(identified);
  });

  test('current expert correction wins over a historical AI guess', async () => {
    prisma.scan.findMany.mockResolvedValue([{ equivalentsJson: [{ name: 'OLD WRONG PRODUCT' }] }]);
    prisma.expertEquivalence.findUnique.mockResolvedValue({ molydalEquivalent: 'H 125 AL', confidence: 100, noEquivalent: false });
    const result = await service.analyzeImage('AA==', 'image/jpeg', 'user');
    expect(result.equivalents[0].name).toBe('H 125 AL');
    expect(prisma.scan.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ scanEmailPending: true }),
    });
    expect(prisma.scan.findMany).not.toHaveBeenCalled();
    expect(vector.dualSearch).not.toHaveBeenCalled();
  });
  test.each([
    { type: 'high temperature silicone sealant', category: 'other' },
    { type: 'paste', category: 'adhesive' },
    { type: 'paste', category: 'sealant' },
    { type: 'colle epoxy', category: 'other' },
    { type: 'silicone sealant', category: 'grease' },
  ])('blocks the family before stale positive expert/RAG mappings: %j', async (product) => {
    jest.spyOn(service as any, 'identifyProduct').mockResolvedValue({ ...identified, name: 'BRIK-CEN CS-350', ...product });
    prisma.expertEquivalence.findUnique.mockResolvedValue({ molydalEquivalent: 'AGL 30 AL', confidence: 85, noEquivalent: false });
    const result = await service.analyzeImage('AA==', 'image/jpeg', 'user', undefined, undefined, undefined, 'fr-FR');
    expect(result).toMatchObject({ equivalents: [], sources: [], analysis: 'Produit qui n’existe pas dans la gamme Molydal.' });
    expect(prisma.expertEquivalence.findUnique).not.toHaveBeenCalled();
    expect(vector.dualSearch).not.toHaveBeenCalled();
    expect(mockGenerateContent).not.toHaveBeenCalled();
    expect(prisma.scan.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      status: 'no_match', compatibility: null, molydalEquivalent: null, equivalentsJson: [],
      analysisText: result.analysis, scanEmailPending: true,
    }) });
    expect(scanEmailNotification.notifyCompletedScan).toHaveBeenCalledWith('scan');
  });
  test('does not block an ordinary silicone lubricant before expert matching', async () => {
    jest.spyOn(service as any, 'identifyProduct').mockResolvedValue({ ...identified, type: 'silicone lubricant spray', category: 'general_lubricant_spray' });
    prisma.expertEquivalence.findUnique.mockResolvedValue({ molydalEquivalent: 'SILICONES', confidence: 100, noEquivalent: false });
    expect((await service.analyzeImage('AA==', 'image/jpeg', 'user')).equivalents[0].name).toBe('SILICONES');
  });
  test('blocks sealants in the selection function too, without asking the model for a closest match', async () => {
    const result = await (service as any).generateEquivalenceAnalysis({ ...identified, type: 'sealant' }, 'AGL 30 AL datasheet', ['AGL 30 AL']);
    expect(result.equivalents).toEqual([]);
    expect(result.analysis).toBe('Produit qui n’existe pas dans la gamme Molydal.');
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });
  test.each(['fr-FR', 'en-US'])('pins the requested language in the final selection instruction (%s)', async (language) => {
    mockGenerateContent.mockResolvedValue({ response: { text: () => JSON.stringify({
      equivalents: [{ name: 'H 125 AL', family: 'Oil', compatibility: 90, reason: 'Verified application' }], analysis: 'Verified application',
    }) } });
    await (service as any).generateEquivalenceAnalysis(identified, 'datasheet', ['H 125 AL'], 'English label text', language);
    const prompt = mockGenerateContent.mock.calls[0][0];
    expect(prompt).toContain(language.startsWith('fr') ? 'uniquement en français' : 'in English');
    expect(prompt).not.toBe('Molydal equivalent?');
  });

  test('expert no-equivalent decision is persisted without a product or model fallback', async () => {
    prisma.expertEquivalence.findUnique.mockResolvedValue({ noEquivalent: true, molydalEquivalent: '', confidence: 0 });
    const result = await service.analyzeImage('AA==', 'image/jpeg', 'user');
    expect(result.equivalents).toEqual([]);
    expect(result.analysis).toContain('pas d’équivalent');
    expect(prisma.scan.create).toHaveBeenCalledWith({ data: expect.objectContaining({ status: 'no_match', molydalEquivalent: null, equivalentsJson: [], scanEmailPending: true }) });
    expect(vector.dualSearch).not.toHaveBeenCalled();
    expect(mockGenerateContent).not.toHaveBeenCalled();
    expect(scanEmailNotification.notifyCompletedScan).toHaveBeenCalledWith('scan');
  });

  test('ignores an archived expert target and searches active candidates without inventing a no-equivalent decision', async () => {
    prisma.pimProduct.findMany.mockResolvedValue([{ name: 'STARNET', active: false }, { name: 'STARNET+', active: true }]);
    prisma.expertEquivalence.findUnique.mockResolvedValue({ molydalEquivalent: 'STARNET', confidence: 100, noEquivalent: false });
    vector.dualSearch.mockResolvedValue([{ product_name: 'STARNET+', similarity: 0.9, chunk_text: 'Current datasheet' }]);
    mockGenerateContent.mockResolvedValue({ response: { text: () => JSON.stringify({ equivalents: [{ name: 'STARNET+', compatibility: 90, family: 'Cleaner', reason: 'Current datasheet' }], analysis: 'Current active product' }) } });
    const result = await service.analyzeImage('AA==', 'image/jpeg', 'user');
    expect(vector.dualSearch).toHaveBeenCalled();
    expect(result.equivalents.map((e) => e.name)).toEqual(['STARNET+']);
    expect(result.analysis).not.toContain('experts');
  });

  test.each([
    { name: 'STARNET+', rows: [{ name: 'STARNET', active: false }, { name: 'STARNET+', active: true }] },
    { name: 'KL BIO', rows: [{ name: 'KL BIO', active: false }, { name: 'KL BIO', active: true }] },
    { name: 'EXPERT UNKNOWN', rows: [] },
  ])('preserves valid expert mappings for $name', async ({ name, rows }) => {
    prisma.pimProduct.findMany.mockResolvedValue(rows);
    prisma.expertEquivalence.findUnique.mockResolvedValue({ molydalEquivalent: name, confidence: 100, noEquivalent: false });
    const result = await service.analyzeImage('AA==', 'image/jpeg', 'user');
    expect(result.equivalents[0].name).toBe(name);
    expect(vector.dualSearch).not.toHaveBeenCalled();
  });

  test('saves the answer and notifies after an unrecognized scan', async () => {
    jest.spyOn(service as any, 'identifyProduct').mockResolvedValue({ ...identified, name: '' });
    const result = await service.analyzeImage('AA==', 'image/jpeg', 'user');
    expect(prisma.scan.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ analysisText: result.analysis, status: 'no_match', scanEmailPending: true }),
    });
    expect(scanEmailNotification.notifyCompletedScan).toHaveBeenCalledWith('scan');
  });

  test('an offline replay returns the saved scan without sending another email', async () => {
    prisma.scan.findUnique.mockResolvedValue({
      id: 'scan', userId: 'user', identifiedName: 'Competitor 68',
      identifiedBrand: 'Brand', identifiedType: 'oil', identifiedSpecs: 'ISO 68',
      analysisText: 'Existing answer', equivalentsJson: [],
    });
    const result = await service.analyzeImage('AA==', 'image/jpeg', 'user', undefined, undefined, 'request');
    expect(result.analysis).toBe('Existing answer');
    expect(prisma.scan.create).not.toHaveBeenCalled();
    expect(scanEmailNotification.notifyCompletedScan).not.toHaveBeenCalled();
  });

  test('a notification failure never turns a saved scan into a failed request', async () => {
    scanEmailNotification.notifyCompletedScan.mockRejectedValue(new Error('provider unavailable'));
    prisma.expertEquivalence.findUnique.mockResolvedValue({ molydalEquivalent: 'H 125 AL', confidence: 100, noEquivalent: false });
    await expect(service.analyzeImage('AA==', 'image/jpeg', 'user')).resolves.toMatchObject({ id: 'scan' });
    expect(prisma.scan.create).toHaveBeenCalledTimes(1);
  });

  test.each([
    { note: 'Commander OLD25L.', expected: null },
    { note: 'Convient pour le nettoyage.', expected: 'Convient pour le nettoyage.' },
  ])('keeps an active expert mapping without repeating a discontinued code from its note: $note', async ({ note, expected }) => {
    const expert = { molydalEquivalent: 'STARNET+', confidence: 100, noEquivalent: false, note };
    prisma.expertEquivalence.findUnique.mockResolvedValue(expert);
    prisma.pimProduct.findMany.mockResolvedValue([{ name: 'STARNET+', active: true,
      references: [{ code: 'OLD25L', active: false }, { code: 'NEW5L', active: true }] }]);
    const result = await service.analyzeImage('AA==', 'image/jpeg', 'user');
    expect(result.equivalents[0].name).toBe('STARNET+');
    expect(JSON.stringify(result)).not.toContain('OLD25L');
    if (expected) expect(result.equivalents[0].reason).toBe(expected);
    expect(expert.note).toBe(note);
    expect(vector.dualSearch).not.toHaveBeenCalled();
  });

  test('empty retrieval does not ask a model to invent an equivalent', async () => {
    const result = await service.analyzeImage('AA==', 'image/jpeg', 'user');
    expect(result.equivalents).toEqual([]);
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });

  test.each([
    { name: 'Shell', brand: 'Shell' },
    { name: 'graisse', brand: 'Shell' },
  ])('does not propose an equivalent when Vision only reads $name', async ({ name, brand }) => {
    jest.spyOn(service as any, 'identifyProduct').mockResolvedValue({ ...identified, name, brand });
    const result = await service.analyzeImage('AA==', 'image/jpeg', 'user');
    expect(result.identified.name).toBe('');
    expect(result.equivalents).toEqual([]);
    expect(prisma.scan.create).toHaveBeenCalledWith({ data: expect.objectContaining({ status: 'no_match' }) });
    expect(vector.dualSearch).not.toHaveBeenCalled();
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
