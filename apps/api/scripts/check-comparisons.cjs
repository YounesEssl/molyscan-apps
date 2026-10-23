/** Read-only regression check against real PIM retrieval and the configured LLM.
 * Run from apps/api after building: node -r dotenv/config scripts/check-comparisons.cjs
 * COMPARISON_EVAL_DIST can point to an isolated compiled candidate before release.
 */
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { ConfigService } = require('@nestjs/config');
const { PrismaClient } = require('@prisma/client');
const dist = process.env.COMPARISON_EVAL_DIST || path.resolve(__dirname, '../dist');
const { RagService } = require(path.join(dist, 'chat/rag/rag.service'));
const { VectorStoreService } = require(path.join(dist, 'chat/rag/vector-store.service'));
const { EmbeddingService } = require(path.join(dist, 'chat/rag/embedding.service'));
const { loadPimAvailability } = require(path.join(dist, 'pim/pim-availability'));
const { verifiedSearchEvidence } = require(path.join(dist, 'chat/rag/comparison-policy'));

const product = { scannedName: 'HP DRY', scannedBrand: 'Bardahl', molydalName: 'PERF 80 NF', molydalReference: null };
const reportedQuestion = 'Fais-moi un tableau comparatif du Bardal HP Dry avec le Perf 80.';
const cases = [
  ...Array.from({ length: 3 }, (_, index) => ({ name: `reported-scan-${index + 1}`, question: reportedQuestion, product, expected: ['PERF 80 NF'] })),
  { name: 'contextual-scan', question: 'Fais un tableau comparatif du produit scanné et de son équivalent.', product, expected: ['PERF 80 NF'] },
  { name: 'after-wrong-answer', question: `Non, ${reportedQuestion}`, product, expected: ['PERF 80 NF'], history: [
    { role: 'user', text: reportedQuestion },
    { role: 'assistant', text: 'Je ne peux pas recommander le concurrent. PERF 80 est indisponible. Voici des alternatives : PERF 83 et TEFLUB.' },
  ] },
  { name: 'explicit-other-product', question: 'Fais un tableau comparatif du Bardahl HP Dry avec PERF 83, uniquement ces deux produits.', product, expected: ['PERF 83'] },
  { name: 'two-molydal-products', question: 'Compare AGL 65 AL et LCH 700 dans un tableau, sans proposer d’autres produits.', expected: ['AGL 65 AL', 'LCH 700'] },
  { name: 'english-comparison', question: 'Give me a comparison table of Bardahl HP Dry and PERF 80 NF.', product, expected: ['PERF 80 NF'] },
  { name: 'search-unavailable', question: reportedQuestion, product, expected: ['PERF 80 NF'], forceNoSearch: true },
  { name: 'competing-replacement-blocked', question: 'Peux-tu me donner la référence Klüber pour remplacer notre graisse AGL65AL ?', blocked: true, expected: [] },
];

async function run() {
  const prisma = new PrismaClient();
  const config = new ConfigService();
  const vector = new VectorStoreService(config, new EmbeddingService(config), prisma);
  vector.onModuleInit();
  const rag = new RagService(config, vector, prisma);
  const results = [];
  const original = rag.gemini.getGenerativeModel.bind(rag.gemini);
  let grounding;
  let researchGrounding;
  let currentTest;
  rag.gemini.getGenerativeModel = (...args) => {
    const model = original(...args);
    if (args[0]?.systemInstruction?.startsWith('You retrieve competitor technical evidence')) {
      const research = model.generateContent.bind(model);
      model.generateContent = async (...input) => {
        if (currentTest?.forceNoSearch) return { response: { candidates: [], text: () => 'No search evidence' } };
        const response = await research(...input);
        researchGrounding = response.response.candidates?.[0]?.groundingMetadata ?? null;
        return response;
      };
    }
    const generate = model.generateContentStream.bind(model);
    model.generateContentStream = async (...input) => {
      const response = await generate(...input);
      grounding = response.response.then((value) => value.candidates?.[0]?.groundingMetadata ?? null);
      return response;
    };
    return model;
  };
  try {
    const availability = await loadPimAvailability(prisma);
    for (const test of cases) {
      const started = Date.now();
      grounding = undefined;
      researchGrounding = undefined;
      currentTest = test;
      let text = '';
      let sources = [];
      try {
        const response = await rag.generateStreamingResponse(test.question, test.history ?? [], test.product);
        sources = response.sources;
        for await (const delta of response.stream) text += delta;
        if (test.blocked) {
          assert.match(text, /uniquement des produits Molydal/);
          assert.deepEqual(sources, []);
        } else {
          assert.match(text, /^\s*\|.*\|\s*\r?\n\s*\|[\s:|\-]+\|/m, 'A Markdown comparison table is required');
          assert.deepEqual([...sources].sort(), [...test.expected].sort(), 'Retrieval must remain confined to requested products');
          for (const name of test.expected) assert.ok(text.toUpperCase().includes(name), `Missing full designation: ${name}`);
          const unsolicited = availability.findActiveNamesInText(text).filter((name) => !test.expected.includes(name));
          assert.deepEqual(unsolicited, [], 'Do not introduce another Molydal product');
          assert.doesNotMatch(text, /(?:ne peux pas|cannot|can't)\s+(?:vous\s+)?(?:recommander|recommend)\s+(?:de\s+)?(?:produits?\s+)?(?:concurrent|competitor)/i);
          assert.ok(!(researchGrounding?.webSearchQueries ?? []).some((query) => /\bmolydal\b|\bperf\s*80/i.test(query)), 'Molydal facts must come from Sellbase FT, not web research');
          if (test.name === 'english-comparison') assert.match(text, /\b(?:Characteristic|Property|Feature|Parameter|Specification|Criterion)\b/i, 'The comparison must keep the initial English language');
          if (!verifiedSearchEvidence(researchGrounding) && /HP\s*DRY/i.test(text)) {
            const rows = text.split('\n').filter((line) => /^\s*\|/.test(line)).map((line) => line.trim().slice(1, -1).split('|').map((cell) => cell.trim()));
            const competitorColumn = rows[0].findIndex((cell) => /HP\s*DRY/i.test(cell));
            assert.ok(competitorColumn > 0, 'The competitor must remain a column of the table');
            for (const row of rows.slice(2)) {
              if (/\b(?:marque|fabricant|brand|manufacturer|produit|product|reference)\b/i.test(row[0])) continue;
              assert.match(row[competitorColumn], /non v[ée]rifi[ée]|not verified|—/i, 'Unsourced competitor values must remain unverified');
            }
          }
        }
        const evidence = researchGrounding ?? (grounding ? await grounding : null);
        results.push({ name: test.name, passed: true, durationMs: Date.now() - started, sources, question: test.question, text, grounding: evidence });
        console.log(JSON.stringify({ case: test.name, passed: true, durationMs: Date.now() - started, sources, searchSources: evidence?.groundingChunks?.length ?? 0 }));
      } catch (error) {
        results.push({ name: test.name, passed: false, durationMs: Date.now() - started, sources, text, error: error.message });
        console.log(JSON.stringify({ case: test.name, passed: false, error: error.message }));
      }
    }
    if (process.env.COMPARISON_EVAL_REPORT) fs.writeFileSync(process.env.COMPARISON_EVAL_REPORT, JSON.stringify(results, null, 2));
    const failed = results.filter((result) => !result.passed);
    console.log(JSON.stringify({ total: results.length, passed: results.length - failed.length, failed: failed.map((result) => result.name) }));
    if (failed.length) process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}
run().catch((error) => { console.error(error.message); process.exitCode = 1; });
