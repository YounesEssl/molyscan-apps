/** Real-model, read-only check. No scan, upload or notification is written.
 * From apps/api: SCAN_SCOPE_FIXTURE_ID=<reported scan> node -r dotenv/config scripts/check-scan-scope.cjs
 * SCAN_SCOPE_EVAL_DIST may select an isolated candidate build before release.
 */
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { ConfigService } = require('@nestjs/config');
const { PrismaClient } = require('@prisma/client');
const dist = process.env.SCAN_SCOPE_EVAL_DIST || path.resolve(__dirname, '../dist');
const { ImageAnalysisService } = require(path.join(dist, 'scans/image-analysis.service'));
const { StorageService } = require(path.join(dist, 'storage/storage.service'));
const { RagService } = require(path.join(dist, 'chat/rag/rag.service'));
const { VectorStoreService } = require(path.join(dist, 'chat/rag/vector-store.service'));
const { EmbeddingService } = require(path.join(dist, 'chat/rag/embedding.service'));
const { isAdhesiveOrSealant } = require(path.join(dist, 'common/utils/product-scope'));

async function run() {
  const p = new PrismaClient();
  const config = new ConfigService();
  const results = [];
  const vector = new VectorStoreService(config, new EmbeddingService(config), p);
  vector.onModuleInit();
  const rag = new RagService(config, vector, p);
  let persisted;
  let notifications = 0;
  const readOnlyPrisma = {
    scan: { findUnique: (args) => p.scan.findUnique(args), create: async ({ data }) => { persisted = data; return { id: 'read-only-probe' }; } },
    expertEquivalence: p.expertEquivalence,
    pimProduct: p.pimProduct,
  };
  const service = new ImageAnalysisService(config, readOnlyPrisma, rag, vector,
    { upload: async () => {} }, { notifyCompletedScan: async () => { notifications += 1; } });
  try {
    const scan = await p.scan.findUnique({ where: { id: process.env.SCAN_SCOPE_FIXTURE_ID }, select: { photoKey: true } });
    assert.ok(scan?.photoKey, 'The reported photo must be available');
    const stream = await new StorageService(config).download(scan.photoKey);
    const buffers = [];
    for await (const chunk of stream) buffers.push(Buffer.from(chunk));
    const image = Buffer.concat(buffers).toString('base64');
    for (const language of ['fr', 'fr-FR', 'fr', 'en']) {
      const response = await service.analyzeImage(image, 'image/jpeg', 'read-only-probe', undefined, undefined, undefined, language);
      assert.ok(isAdhesiveOrSealant(response.identified), 'Vision must preserve the sealant function');
      assert.deepEqual(response.equivalents, []);
      assert.deepEqual(response.sources, []);
      assert.equal(persisted.status, 'no_match');
      assert.equal(persisted.compatibility, null);
      assert.equal(response.analysis, language.startsWith('fr') ? 'Produit qui n’existe pas dans la gamme Molydal.' : 'This product is not available in the Molydal range.');
      results.push({ case: `reported-photo-${language}-${results.length + 1}`, passed: true, identified: response.identified, analysis: response.analysis });
      console.log(JSON.stringify({ case: results.at(-1).case, passed: true, category: response.identified.category, equivalents: 0 }));
    }
    const index = await p.ragIndexVersion.findFirst({ where: { status: 'active' }, orderBy: { activatedAt: 'desc' } });
    const chunks = await p.ragChunk.findMany({ where: { indexId: index.id, product: { name: 'CONTACTOL NF', active: true } }, select: { content: true } });
    assert.ok(chunks.length);
    for (const [language, context] of [['fr', undefined], ['fr-FR', 'Please find an electrical contact cleaner'], ['en', undefined]]) {
      const response = await service.generateEquivalenceAnalysis({ name: 'Contact Cleaner', brand: 'CRC', type: 'electrical contact cleaner aerosol', specs: 'Electrical contacts cleaner', category: 'contact_cleaner_electrical', format: 'aerosol' },
        chunks.map((row) => row.content).join('\n\n'), ['CONTACTOL NF'], context, language);
      assert.equal(response.equivalents[0]?.name, 'CONTACTOL NF', 'Keep ordinary lubricant/cleaner selection working');
      const prose = `${response.analysis} ${response.equivalents[0].reason}`;
      if (language.startsWith('fr')) {
        assert.doesNotMatch(prose, /\b(?:the|this|it is|suitable for|within the|for the)\b/i);
        assert.match(prose, /\b(?:le|la|les|pour|avec|est|nettoyant|correspond|permet|même)\b/i);
      } else assert.match(prose, /\b(?:the|this|is|for|with|equivalent|cleaner)\b/i);
      results.push({ case: `selection-language-${language}`, passed: true, response });
      console.log(JSON.stringify({ case: results.at(-1).case, passed: true, equivalent: 'CONTACTOL NF' }));
    }
    assert.equal(notifications, 4, 'Notification calls were intercepted, never sent');
    if (process.env.SCAN_SCOPE_EVAL_REPORT) fs.writeFileSync(process.env.SCAN_SCOPE_EVAL_REPORT, JSON.stringify(results, null, 2));
    console.log(JSON.stringify({ total: results.length, passed: results.length, writes: 0, emails: 0 }));
  } finally { await p.$disconnect(); }
}
run().catch((error) => { console.error(error.message); process.exitCode = 1; });
