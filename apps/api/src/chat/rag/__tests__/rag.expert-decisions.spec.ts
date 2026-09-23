import { RagService } from '../rag.service';

const mockGenerateContent = jest.fn();
const mockGenerateContentStream = jest.fn();
const mockGetModel = jest.fn();
jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: (...args: any[]) => {
      mockGetModel(...args);
      return { generateContent: mockGenerateContent, generateContentStream: mockGenerateContentStream };
    },
  })),
}));

describe('Expert decisions in assistant conversations', () => {
  let service: RagService;
  let prisma: any;
  let vector: any;
  const decision = { competitorBrand: 'Brand', competitorName: 'Product 68', noEquivalent: true, note: null };
  beforeEach(() => {
    jest.clearAllMocks();
    prisma = { expertEquivalence: { findUnique: jest.fn().mockResolvedValue(decision), findMany: jest.fn().mockResolvedValue([decision]) }, pimProduct: { findMany: jest.fn().mockResolvedValue([]) } };
    vector = { dualSearch: jest.fn().mockResolvedValue([]) };
    service = new RagService({ getOrThrow: () => 'test-key' } as any, vector, prisma);
    jest.spyOn(service, 'reformulateQuery').mockImplementation(async (question) => question);
    mockGenerateContent.mockResolvedValue({ response: { text: () => 'Technical response' } });
    mockGenerateContentStream.mockImplementation(async () => ({ stream: (async function* () { yield { text: () => 'Technical response' }; })() }));
  });
  test('returns a no-equivalent decision deterministically in product chat', async () => {
    const response = await service.generateResponse({ question: 'Quel équivalent ?', conversationHistory: [], productContext: { scannedBrand: 'Brand', scannedName: 'Product 68', molydalName: 'OLD GUESS', molydalReference: '' } });
    expect(response.text).toContain('pas d’équivalent');
    expect(response.text).not.toContain('OLD GUESS');
    expect(vector.dualSearch).not.toHaveBeenCalled();
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });
  test('streams the same decision in free chat', async () => {
    const response = await service.generateStreamingResponse('What is the equivalent of Brand Product 68?', []);
    let text = '';
    for await (const part of response.stream) text += part;
    expect(text).toContain('no equivalent');
    expect(response.sources).toEqual([]);
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });
  test('recognizes an explicitly named unique product without a brand', async () => {
    expect((await (service as any).resolveExpertContext('Quel équivalent de Product 68 ?', [])).expert).toBe(decision);
  });
  test('does not apply grade 68 to grade 680 through substring matching', async () => {
    const context = await (service as any).resolveExpertContext('Brand Product 680', []);
    expect(context.expert).toBeNull();
  });
  test('does not select an ambiguous product name shared by brands', async () => {
    prisma.expertEquivalence.findMany.mockResolvedValue([decision, { ...decision, competitorBrand: 'Other' }]);
    expect((await (service as any).resolveExpertContext('Product 68', [])).expert).toBeNull();
    expect((await (service as any).resolveExpertContext('Brand Product 68', [])).expert).toBe(decision);
  });
  test('does not bypass expert decisions when the database is unavailable', async () => {
    prisma.expertEquivalence.findMany.mockRejectedValue(new Error('Database unavailable'));
    await expect(service.generateStreamingResponse('Brand Product 68', [])).rejects.toThrow('Database unavailable');
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });
  test.each(['Peux-tu quand même proposer le plus proche ?', 'Et un remplacement ?', 'Quel équivalent pour ce produit ?', 'Quel équivalent en NSF H1 ?', 'Une alternative A1 ?', 'Quel équivalent pour NSF H1 ?', 'Et pour une utilisation alimentaire, quel équivalent ?'])('retains a free-chat veto in a contextual follow-up: %s', async (question) => {
    const response = await service.generateStreamingResponse(question, [
      { role: 'user', text: 'Quel équivalent de Brand Product 68 ?' },
      { role: 'assistant', text: 'Aucun équivalent confirmé.' },
    ]);
    let text = '';
    for await (const part of response.stream) text += part;
    expect(text).toContain('pas d’équivalent');
    expect(mockGenerateContentStream).not.toHaveBeenCalled();
    expect(vector.dualSearch).not.toHaveBeenCalled();
  });
  test('preserves the same veto in a non-streaming follow-up', async () => {
    const result = await service.generateResponse({ question: 'Une alternative ?', conversationHistory: [
      { role: 'user', text: 'Quel équivalent de Brand Product 68 ?' },
      { role: 'assistant', text: 'Aucun équivalent confirmé.' },
    ] });
    expect(result.text).toContain('pas d’équivalent');
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });
  test('answers technical questions about a vetoed scan with the PDF and scoped expert instruction', async () => {
    const question = 'Résume les précautions de manipulation du PDF joint.';
    const attachment = { base64: 'JVBERi0=', filename: 'concurrent.pdf' } as any;
    const response = await service.generateStreamingResponse(question, [], {
      scannedBrand: 'Brand', scannedName: 'Product 68', molydalName: 'OLD GUESS', molydalReference: '',
      equivalents: [{ name: 'OLD GUESS', family: 'old', compatibility: 99, reason: 'Old guess' }],
      analysisText: 'OLD GUESS recommended',
    }, attachment);
    let text = '';
    for await (const part of response.stream) text += part;
    expect(text).toBe('Technical response');
    const systemInstruction = mockGetModel.mock.calls[0][0].systemInstruction;
    expect(systemInstruction).toContain('DÉCISION EXPERTE MOLYDAL : AUCUN ÉQUIVALENT');
    expect(systemInstruction).toContain('Brand Product 68');
    expect(systemInstruction).not.toContain('OLD GUESS');
    expect(vector.dualSearch).toHaveBeenCalledWith(question, question, undefined);
    expect(mockGenerateContentStream).toHaveBeenCalledWith({ contents: [{ role: 'user', parts: [
      { inlineData: { mimeType: 'application/pdf', data: attachment.base64 } }, { text: question },
    ] }] });
  });
  test('treats NSF H1 as a technical constraint rather than a change of product', async () => {
    await service.generateResponse({ question: 'Quelle est sa certification NSF H1 ?', conversationHistory: [],
      productContext: { scannedBrand: 'Brand', scannedName: 'Product 68', molydalName: 'OLD GUESS', molydalReference: '' } });
    expect(mockGetModel.mock.calls[0][0].systemInstruction).toContain('DÉCISION EXPERTE MOLYDAL : AUCUN ÉQUIVALENT');
    expect(mockGenerateContent).toHaveBeenCalled();
  });
  test('allows an explicit switch to another curated product despite the original scan veto', async () => {
    const other = { competitorBrand: 'Other', competitorName: 'Another 46', noEquivalent: false, molydalEquivalent: 'VALID PRODUCT', note: null };
    prisma.expertEquivalence.findMany.mockResolvedValue([decision, other]);
    await service.generateStreamingResponse('Quel équivalent de Other Another 46 ?', [
      { role: 'user', text: 'Quel équivalent de Brand Product 68 ?' },
    ], { scannedBrand: 'Brand', scannedName: 'Product 68', molydalName: 'OLD GUESS', molydalReference: '' });
    const instruction = mockGetModel.mock.calls[0][0].systemInstruction;
    expect(instruction).toContain('Other Another 46 → VALID PRODUCT');
    expect(instruction).not.toContain('OLD GUESS');
    expect(instruction).not.toContain('SCAN CONTEXT');
    expect(mockGenerateContentStream).toHaveBeenCalled();
  });
  test.each(['Et pour Shell Tellus S2 MX 46 ?', 'Quel équivalent de Shell Tellus ?', 'Quel équivalent de Shell Product 68 ?', 'Brand Product 680'])('allows a new product without an expert record: %s', async (question) => {
    await service.generateStreamingResponse(question, [
      { role: 'user', text: 'Quel équivalent de Brand Product 68 ?' },
    ], { scannedBrand: 'Brand', scannedName: 'Product 68', molydalName: 'OLD GUESS', molydalReference: '' });
    const instruction = mockGetModel.mock.calls[0][0].systemInstruction;
    expect(instruction).not.toContain('DÉCISION EXPERTE MOLYDAL : AUCUN ÉQUIVALENT');
    expect(instruction).not.toContain('SCAN CONTEXT');
    expect(vector.dualSearch).toHaveBeenCalledWith(question, question, undefined);
  });
  test('does not revive an earlier veto after a user has switched to an uncurated product', async () => {
    await service.generateStreamingResponse('Peux-tu proposer le plus proche ?', [
      { role: 'user', text: 'Quel équivalent de Brand Product 68 ?' },
      { role: 'assistant', text: 'Aucun équivalent.' },
      { role: 'user', text: 'Et pour Shell Tellus S2 MX 46 ?' },
      { role: 'assistant', text: 'Merci de fournir sa fiche.' },
    ]);
    expect(mockGetModel.mock.calls[0][0].systemInstruction).not.toContain('DÉCISION EXPERTE MOLYDAL : AUCUN ÉQUIVALENT');
    expect(mockGenerateContentStream).toHaveBeenCalled();
  });
  test('does not promote product names introduced only by earlier AI messages to expert context', async () => {
    await service.generateStreamingResponse('Une alternative ?', [{ role: 'assistant', text: 'Brand Product 68' }]);
    expect(mockGenerateContentStream).toHaveBeenCalled();
  });

  test('withdraws an archived expert target and historical scan suggestions while searching current candidates', async () => {
    const old = { ...decision, noEquivalent: false, molydalEquivalent: 'STARNET' };
    prisma.expertEquivalence.findMany.mockResolvedValue([old]);
    prisma.expertEquivalence.findUnique.mockResolvedValue(old);
    prisma.pimProduct.findMany.mockResolvedValue([{ name: 'STARNET', active: false }, { name: 'STARNET+', active: true }]);
    vector.dualSearch.mockResolvedValue([{ product_name: 'STARNET+', similarity: 0.9, chunk_text: 'Current datasheet' }]);
    const history = [{ role: 'assistant', text: 'Je propose STARNET.' }];
    const result = await service.generateStreamingResponse('Quel équivalent ?', history, {
      scannedName: 'Product 68', scannedBrand: 'Brand', molydalName: 'STARNET', molydalReference: 'old-ref',
      equivalents: [{ name: 'STARNET', family: '', compatibility: 100, reason: 'Old mapping' }], analysisText: 'STARNET est conseillé.',
    });
    const instruction = mockGetModel.mock.calls[0][0].systemInstruction;
    expect(instruction).not.toContain('→ STARNET');
    expect(instruction).not.toContain('Identified Molydal equivalent: STARNET');
    expect(instruction).not.toContain('STARNET est conseillé');
    expect(instruction).not.toContain('DÉCISION EXPERTE MOLYDAL : AUCUN ÉQUIVALENT');
    expect(service.reformulateQuery).toHaveBeenCalledWith('Quel équivalent ?', expect.arrayContaining([expect.objectContaining({ text: expect.stringContaining('recommendation withdrawn') })]));
    expect(JSON.stringify(mockGenerateContentStream.mock.calls[0])).not.toContain('Je propose STARNET.');
    expect(history[0].text).toBe('Je propose STARNET.');
    expect(result.sources).toEqual(['STARNET+']);
  });

  test('applies the same archive rule to non-streaming chat and stale retrieved chunks', async () => {
    const old = { ...decision, noEquivalent: false, molydalEquivalent: 'STARNET' };
    prisma.expertEquivalence.findMany.mockResolvedValue([old]);
    prisma.pimProduct.findMany.mockResolvedValue([{ name: 'STARNET', active: false }]);
    vector.dualSearch.mockResolvedValue([{ product_name: 'STARNET', similarity: 0.9, chunk_text: 'Old datasheet' }]);
    const result = await service.generateResponse({ question: 'Quel équivalent de Brand Product 68 ?', conversationHistory: [{ role: 'assistant', text: 'STARNET convient.' }] });
    expect(result.sources).toEqual([]);
    expect(mockGetModel.mock.calls[0][0].systemInstruction).not.toContain('→ STARNET');
    expect(JSON.stringify(mockGenerateContent.mock.calls[0])).not.toContain('STARNET convient');
    expect(vector.dualSearch).toHaveBeenCalled();
  });

  test.each([
    { name: 'STARNET+', rows: [{ name: 'STARNET', active: false }, { name: 'STARNET+', active: true }] },
    { name: 'KL BIO', rows: [{ name: 'KL BIO', active: false }, { name: 'KL BIO', active: true }] },
    { name: 'UNKNOWN', rows: [] },
  ])('keeps expert authority for $name when it is not known inactive', async ({ name, rows }) => {
    prisma.expertEquivalence.findMany.mockResolvedValue([{ ...decision, noEquivalent: false, molydalEquivalent: name }]);
    prisma.pimProduct.findMany.mockResolvedValue(rows);
    await service.generateStreamingResponse('Quel équivalent de Brand Product 68 ?', []);
    expect(mockGetModel.mock.calls[0][0].systemInstruction).toContain(`→ ${name}`);
  });

  test('removes discontinued references from a still-active product context without rewriting its stored history', async () => {
    prisma.expertEquivalence.findMany.mockResolvedValue([]);
    prisma.expertEquivalence.findUnique.mockResolvedValue(null);
    prisma.pimProduct.findMany.mockResolvedValue([{ name: 'STARNET+', active: true,
      references: [{ code: 'OLD25L', active: false }, { code: 'NEW5L', active: true }] }]);
    const history = [{ role: 'assistant', text: 'STARNET+ est disponible sous OLD25L, bidon 25 L.' }];
    const productContext = { scannedName: 'Cleaner', scannedBrand: 'Brand', molydalName: 'STARNET+',
      molydalReference: 'OLD25L', analysisText: 'Commander OLD25L.', equivalents: [] };
    await service.generateStreamingResponse('Quelle référence commander ?', history, productContext);
    const instruction = mockGetModel.mock.calls[0][0].systemInstruction;
    expect(instruction).toContain('Identified Molydal equivalent: STARNET+');
    expect(instruction).not.toContain('OLD25L');
    expect(JSON.stringify(mockGenerateContentStream.mock.calls[0])).not.toContain('OLD25L');
    expect(history[0].text).toContain('OLD25L');
    expect(productContext.molydalReference).toBe('OLD25L');
  });

  test('keeps current or unknown reference context while stripping retired codes from equivalence reasons', async () => {
    prisma.expertEquivalence.findMany.mockResolvedValue([]);
    prisma.expertEquivalence.findUnique.mockResolvedValue(null);
    prisma.pimProduct.findMany.mockResolvedValue([{ name: 'STARNET+', active: true,
      references: [{ code: 'OLD25L', active: false }, { code: 'NEW5L', active: true }] }]);
    await service.generateStreamingResponse('Quelle référence commander ?', [], {
      scannedName: 'Cleaner', scannedBrand: 'Brand', molydalName: 'STARNET+', molydalReference: 'NEW5L',
      equivalents: [{ name: 'STARNET+', family: 'Cleaner', compatibility: 90, reason: 'Available as OLD25L.' }],
    });
    const instruction = mockGetModel.mock.calls[0][0].systemInstruction;
    expect(instruction).toContain('STARNET+ (Cleaner)');
    expect(instruction).not.toContain('OLD25L');
    await service.generateStreamingResponse('Quelle référence commander ?', [], {
      scannedName: 'Cleaner', scannedBrand: 'Brand', molydalName: 'STARNET+', molydalReference: 'UNKNOWN',
    });
    expect(mockGetModel.mock.calls.at(-1)[0].systemInstruction).toContain('(ref. UNKNOWN)');
  });

  test('also sanitizes retired reference mentions in non-streaming conversation history', async () => {
    prisma.expertEquivalence.findMany.mockResolvedValue([]);
    prisma.pimProduct.findMany.mockResolvedValue([{ name: 'STARNET+', active: true,
      references: [{ code: 'OLD25L', active: false }] }]);
    await service.generateResponse({ question: 'Quelle référence commander ?', conversationHistory: [{ role: 'assistant', text: 'STARNET+ OLD25L' }] });
    expect(JSON.stringify(mockGenerateContent.mock.calls[0])).not.toContain('OLD25L');
  });

  test.each([
    { note: 'Commander OLD25L.', expected: null },
    { note: 'Convient pour le nettoyage.', expected: 'Convient pour le nettoyage.' },
  ])('keeps the active expert target but removes only a note containing retired reference: $note', async ({ note, expected }) => {
    const expert = { ...decision, noEquivalent: false, molydalEquivalent: 'STARNET+', note };
    prisma.expertEquivalence.findMany.mockResolvedValue([expert]);
    prisma.pimProduct.findMany.mockResolvedValue([{ name: 'STARNET+', active: true,
      references: [{ code: 'OLD25L', active: false }, { code: 'NEW5L', active: true }] }]);
    await service.generateStreamingResponse('Quel équivalent de Brand Product 68 ?', []);
    const instruction = mockGetModel.mock.calls[0][0].systemInstruction;
    expect(instruction).toContain('→ STARNET+');
    expect(instruction).not.toContain('OLD25L');
    if (expected) expect(instruction).toContain(expected);
    expect(expert.note).toBe(note);
  });

});
