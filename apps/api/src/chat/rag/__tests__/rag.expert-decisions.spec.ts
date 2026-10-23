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
  test('rejects the reported reverse equivalence without retrieving or generating competitors', async () => {
    const result = await service.generateResponse({
      question: 'Peux-tu me donner la référence Klüber pour remplacer notre graisse AGL65AL ?',
      conversationHistory: [{ role: 'assistant', text: 'Je peux proposer des références Klüber.' }],
    });
    expect(result.text).toContain('uniquement des produits Molydal');
    expect(result.sources).toEqual([]);
    expect(vector.dualSearch).not.toHaveBeenCalled();
    expect(mockGetModel).not.toHaveBeenCalled();
  });
  test('applies the same scope to streaming chat with a scan or an attachment', async () => {
    const result = await service.generateStreamingResponse('Quel équivalent chez Castrol ?', [], {
      scannedBrand: 'Brand', scannedName: 'Product 68', molydalName: 'AGL 65 AL', molydalReference: '',
    }, { base64: 'JVBERi0=', filename: 'competitor.pdf' } as any);
    let text = '';
    for await (const part of result.stream) text += part;
    expect(text).toContain('uniquement des produits Molydal');
    expect(mockGenerateContentStream).not.toHaveBeenCalled();
  });
  test('keeps a Molydal-only instruction for all other brand formulations', async () => {
    await service.generateStreamingResponse('Un remplacement chez AnotherBrand ?', []);
    expect(mockGetModel.mock.calls[0][0].systemInstruction).toContain('Never recommend a competitor product');
  });
  test('pins the exact active product for the reported SOLESTER follow-up', async () => {
    prisma.pimProduct.findMany.mockResolvedValue([{ name: 'SOLESTER 550', active: true }]);
    await service.generateStreamingResponse('And solester550?', [
      { role: 'user', text: 'Which product should I use?' },
      { role: 'assistant', text: 'I can compare a few grades.' },
    ]);
    expect(vector.dualSearch).toHaveBeenCalledWith(
      'And solester550?', 'And solester550?', undefined, ['SOLESTER 550'],
    );
    expect(mockGetModel.mock.calls[0][0].systemInstruction).toContain('Absence from a ranked search result is NOT evidence');
  });
  test('pins products from the previous answer for a comparison table', async () => {
    prisma.pimProduct.findMany.mockResolvedValue([
      { name: 'LCH 700', active: true }, { name: 'HOTLIFE S 119', active: true },
      { name: 'OLD GRADE', active: false },
    ]);
    await service.generateStreamingResponse('Peux tu me faire tableau comparatif', [
      { role: 'assistant', text: 'LCH 700, HOTLIFE S 119 et OLD GRADE.' },
    ]);
    expect(vector.dualSearch).toHaveBeenCalledWith(
      'Peux tu me faire tableau comparatif', 'Peux tu me faire tableau comparatif',
      undefined, ['LCH 700', 'HOTLIFE S 119'],
    );
  });
  test.each(['stream', 'non-stream'])('retrieves the exact original FT and excludes alternatives for the reported Bardahl / PERF 80 comparison (%s)', async (mode) => {
    prisma.pimProduct.findMany.mockResolvedValue([
      { name: 'PERF 80', active: false }, { name: 'PERF 80 NF', active: true },
      { name: 'PERF 83', active: true }, { name: 'TEFLUB', active: true },
    ]);
    const expert = { competitorBrand: 'Bardahl', competitorName: 'HP DRY', molydalEquivalent: 'PERF 80 NF', noEquivalent: false };
    prisma.expertEquivalence.findMany.mockResolvedValue([expert]);
    prisma.expertEquivalence.findUnique.mockResolvedValue(expert);
    vector.dualSearch.mockResolvedValue([
      { product_name: 'PERF 80 NF', chunk_text: 'Original PERF 80 NF FT: -50 °C to +270 °C; NSF H1', metadata: { source_kind: 'sellbase_technical_sheet', exact_catalogue_match: true } },
      { product_name: 'PERF 83', chunk_text: 'UNRELATED PERF 83 DATASHEET', metadata: {} },
      { product_name: 'TEFLUB', chunk_text: 'UNRELATED TEFLUB DATASHEET', metadata: {} },
    ]);
    const question = 'Fais-moi un tableau comparatif du Bardal HP Dry avec le Perf 80.';
    const product = { scannedName: 'HP DRY', scannedBrand: 'Bardahl', molydalName: 'PERF 80 NF', molydalReference: '' };
    const response = mode === 'stream'
      ? await service.generateStreamingResponse(question, [], product)
      : await service.generateResponse({ question, conversationHistory: [], productContext: product });
    expect(vector.dualSearch.mock.calls[0][3]).toEqual(['PERF 80 NF']);
    expect(response.sources).toEqual(['PERF 80 NF']);
    const instruction = mockGetModel.mock.calls.find(([config]) => config.systemInstruction.includes('FACTUAL COMPARISON'))![0].systemInstruction;
    expect(instruction).toContain('Original PERF 80 NF FT');
    expect(instruction).toContain('FACTUAL COMPARISON, NOT A PRODUCT SEARCH');
    expect(instruction).toContain('"PERF 80" refers to "PERF 80 NF"');
    expect(instruction).not.toContain('UNRELATED');
    expect(instruction).not.toContain('[PERF 83]');
    expect(instruction).not.toContain('[TEFLUB]');
  });
  test('does not treat a factual comparison of equivalents as a request to bypass an expert veto', async () => {
    await service.generateStreamingResponse('Fais un tableau comparatif des équivalents', [], {
      scannedBrand: 'Brand', scannedName: 'Product 68', molydalName: 'OLD GUESS', molydalReference: '',
    });
    expect(mockGenerateContentStream).toHaveBeenCalled();
    expect(mockGetModel.mock.calls[0][0].systemInstruction).toContain('DÉCISION EXPERTE MOLYDAL : AUCUN ÉQUIVALENT');
    expect(mockGetModel.mock.calls[0][0].systemInstruction).toContain('FACTUAL COMPARISON');
  });
  test.each(['stream', 'non-stream'])('passes only grounded search claims into a comparison and appends their actual source (%s)', async (mode) => {
    prisma.pimProduct.findMany.mockResolvedValue([{ name: 'PERF 80 NF', active: true }]);
    prisma.expertEquivalence.findMany.mockResolvedValue([]);
    mockGenerateContent.mockResolvedValue({ response: {
      text: () => 'An unsupported competitor claim must not become evidence.',
      candidates: [{ groundingMetadata: {
        groundingChunks: [{ web: { uri: 'https://manufacturer.example/ft', title: 'Manufacturer FT' } }],
        groundingSupports: [{ segment: { text: 'The supported operating range is -35 to +270 degrees.' }, groundingChunkIndices: [0] }],
      } }],
    } });
    const question = 'Compare HP DRY avec PERF 80 NF';
    const result = mode === 'stream'
      ? await service.generateStreamingResponse(question, [])
      : await service.generateResponse({ question, conversationHistory: [] });
    let text = 'text' in result ? result.text : '';
    if ('stream' in result) for await (const delta of result.stream) text += delta;
    const instruction = mockGetModel.mock.calls.find(([config]) => config.systemInstruction.includes('FACTUAL COMPARISON'))![0].systemInstruction;
    expect(instruction).toContain('The supported operating range');
    expect(instruction).not.toContain('An unsupported competitor claim');
    expect(text).toContain('[Manufacturer FT](https://manufacturer.example/ft)');
    expect(mockGetModel.mock.calls.at(-1)[0].tools).toBeUndefined();
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
    expect(vector.dualSearch).toHaveBeenCalledWith(question, question, undefined, []);
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
    expect(vector.dualSearch).toHaveBeenCalledWith(question, question, undefined, []);
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
