/**
 * Scan pipeline regression harness.
 *
 * Replays REAL production scans (from their stored MinIO photos) through the
 * full image-analysis pipeline — Gemini Vision identification → query build →
 * Supabase retrieval → Claude selection — and scores the final equivalent
 * against ground truth derived automatically from the May-2026 user feedback
 * (scan_equivalent_feedbacks):
 *
 *   - 👍 up-voted equivalentName            → ACCEPTABLE  (expected)
 *   - ✍️  suggestedName on a 👎 down vote    → DESIRED     (expected, strong)
 *   - 👎 down-voted equivalentName          → REJECTED    (forbidden as #1)
 *
 * Because Gemini Vision is non-deterministic even at temperature 0, every case
 * is run RUNS times and we report a PASS RATE, not a single pass/fail. This is
 * the signal used to detect regressions before/after a change.
 *
 * Run on the VPS (needs MinIO + Supabase + all LLM keys):
 *   cd apps/api && RUNS=3 npx ts-node scripts/eval-scan-vision.ts
 *   cd apps/api && RUNS=3 ONLY=down npx ts-node scripts/eval-scan-vision.ts   # only previously-failing scans
 *   cd apps/api && OUT=baseline.json npx ts-node scripts/eval-scan-vision.ts  # dump machine-readable results
 */

import { NestFactory } from '@nestjs/core';
import { Readable } from 'stream';
import * as fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import { AppModule } from '../src/app.module';
import { ImageAnalysisService } from '../src/scans/image-analysis.service';
import { RagService } from '../src/chat/rag/rag.service';
import { VectorStoreService } from '../src/chat/rag/vector-store.service';
import { StorageService } from '../src/storage/storage.service';
import { PrismaService } from '../src/prisma/prisma.service';

const RUNS = parseInt(process.env.RUNS ?? '3', 10);
const SINCE = process.env.SINCE ?? '2026-05-25';
const ONLY = process.env.ONLY ?? 'all'; // 'all' | 'down' (only scans that got at least one down vote)
const OUT = process.env.OUT ?? '';
const CONCURRENCY = parseInt(process.env.CONCURRENCY ?? '5', 10);

// Minimal concurrency pool — runs `worker` over `items` with at most `limit`
// in flight at once. Results preserve input order.
async function pool<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function run(): Promise<void> {
    while (next < items.length) {
      const i = next++;
      results[i] = await worker(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return results;
}

const norm = (s: string) =>
  (s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip accents: aérosol → aerosol
    .toLowerCase()
    .replace(/[\s/\-_.+]+/g, ' ')
    .trim();

// Vocabulary aliases: the reviewer's wording vs the catalog product name for the
// SAME product. Used only to score correctly — e.g. "3790 aérosol" IS "GRAISSE 3790".
const ALIASES: Record<string, string[]> = {
  '3790 aerosol': ['graisse 3790'],
};
const expand = (name: string): string[] => {
  const n = norm(name);
  return [n, ...(ALIASES[n] ?? [])];
};
const despace = (s: string) => norm(s).replace(/ /g, '');
// A candidate matches an expected name if (a) the normalized candidate contains
// the normalized expected/alias (handles "AIRBUL NF" ⊇ "AIRBUL"), or (b) the
// fully de-spaced forms are EQUAL (handles "SCA200" == "SCA 200" without the
// "TOP 5" ⊂ "TOP 50" false positive that a de-spaced *includes* would cause).
const matches = (candidate: string, list: string[]) => {
  const c = norm(candidate);
  if (!c) return false;
  const cd = despace(candidate);
  return list.some((x) =>
    expand(x).some((alias) => c.includes(alias) || cd === alias.replace(/ /g, '')),
  );
};

interface Case {
  scanId: string;
  label: string;
  photoKey: string;
  topPickOriginal: string | null;
  expected: string[]; // up-voted + suggested
  forbidden: string[]; // down-voted (and not also expected)
  hadDown: boolean;
}

interface RunOutcome {
  visionName: string;
  visionBrand: string;
  category?: string;
  format?: string;
  certs: string[];
  reformulated: string;
  retrievedTop: string[];
  expectedRank: number; // -1 if absent
  expectedInTop8: boolean;
  pick: string;
  pass: boolean;
  diagnosis: 'pass' | 'vision' | 'retrieval' | 'ranking' | 'selection';
}

async function streamToBuffer(r: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const c of r) chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c));
  return Buffer.concat(chunks);
}

async function loadCases(prisma: PrismaService): Promise<Case[]> {
  const rows = await prisma.$queryRawUnsafe<
    Array<{
      scanId: string;
      label: string;
      photoKey: string | null;
      topPick: string | null;
      upNames: string[] | null;
      downNames: string[] | null;
      suggested: string[] | null;
    }>
  >(
    `SELECT s.id              AS "scanId",
            s."identifiedName" AS "label",
            s."photoKey"       AS "photoKey",
            s."molydalEquivalent" AS "topPick",
            array_agg(DISTINCT f."equivalentName") FILTER (WHERE f.vote = 'up')   AS "upNames",
            array_agg(DISTINCT f."equivalentName") FILTER (WHERE f.vote = 'down') AS "downNames",
            array_agg(DISTINCT f."suggestedName")  FILTER (WHERE f."suggestedName" IS NOT NULL) AS "suggested"
       FROM scan_equivalent_feedbacks f
       JOIN scans s ON s.id = f."scanId"
      WHERE f."createdAt" >= $1::timestamp
      GROUP BY s.id, s."identifiedName", s."photoKey", s."molydalEquivalent"
      ORDER BY s."identifiedName"`,
    SINCE,
  );

  const cases: Case[] = [];
  for (const r of rows) {
    if (!r.photoKey) continue;
    const up = r.upNames ?? [];
    const suggested = r.suggested ?? [];
    const down = r.downNames ?? [];
    const expected = [...new Set([...up, ...suggested])].filter(Boolean);
    const forbidden = down.filter((d) => !matches(d, expected));
    const hadDown = down.length > 0;
    if (ONLY === 'down' && !hadDown) continue;
    if (expected.length === 0) continue; // nothing to assert against
    cases.push({
      scanId: r.scanId,
      label: r.label ?? r.scanId,
      photoKey: r.photoKey,
      topPickOriginal: r.topPick,
      expected,
      forbidden,
      hadDown,
    });
  }
  return cases;
}

async function runOnce(
  svc: { ias: any; rag: any; vs: VectorStoreService },
  b64: string,
  c: Case,
): Promise<RunOutcome> {
  const { ias, rag, vs } = svc;
  const id = await ias.identifyProduct(b64, 'image/jpeg', undefined);
  const searchQuery = ias.buildSearchQuery(id);
  const reformulationInput = `Find the Molydal equivalent of ${id.name} by ${id.brand}.${id.category ? ` Category: ${id.category}.` : ''}${id.format && id.format !== 'unknown' ? ` Format: ${id.format}.` : ''}${id.applicationContext?.length ? ` Application: ${id.applicationContext.join(', ')}.` : ''}${id.certifications?.length ? ` Certifications: ${id.certifications.join(', ')}.` : ''} Characteristics: ${id.specs}`;
  const reformulated = await rag.reformulateQuery(reformulationInput, []);
  const filters = ias.buildRetrievalFilters(id);
  const allChunks = await vs.dualSearch(
    searchQuery,
    reformulated,
    Object.keys(filters).length ? filters : undefined,
  );
  const sources = [...new Set(allChunks.map((x: any) => x.product_name))];
  const expectedRank = sources.findIndex((s: any) => matches(s as string, c.expected));
  const TOP_K = parseInt(process.env.TOP_K ?? '15', 10);
  const expectedInTop8 = expectedRank >= 0 && expectedRank < TOP_K;

  const top = allChunks.slice(0, TOP_K);
  const context = top
    .map(
      (x: any) =>
        `[${x.product_name}] (relevance: ${(x.similarity * 100).toFixed(0)}%)\n${x.chunk_text}`,
    )
    .join('\n\n---\n\n');
  const srcTop = [...new Set(top.map((x: any) => x.product_name))];
  const analysis = await ias.generateEquivalenceAnalysis(id, context, srcTop, undefined);
  const pick = analysis.equivalents?.[0]?.name ?? '';

  const pickOk = matches(pick, c.expected) && !matches(pick, c.forbidden);
  let diagnosis: RunOutcome['diagnosis'] = 'pass';
  if (!pickOk) {
    if (expectedRank < 0) diagnosis = 'retrieval';
    else if (!expectedInTop8) diagnosis = 'ranking';
    else diagnosis = 'selection';
  }

  return {
    visionName: id.name,
    visionBrand: id.brand,
    category: id.category,
    format: id.format,
    certs: id.certifications ?? [],
    reformulated,
    retrievedTop: sources.slice(0, 12) as string[],
    expectedRank,
    expectedInTop8,
    pick,
    pass: pickOk,
    diagnosis,
  };
}

(async () => {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error'],
  });
  const ias = app.get(ImageAnalysisService) as any;
  const rag = app.get(RagService) as any;
  const vs = app.get(VectorStoreService);
  const storage = app.get(StorageService);
  const prisma = app.get(PrismaService);

  const cases = await loadCases(prisma);

  // Load the distinct catalog product names from Supabase so we can flag cases
  // whose expected answer simply does NOT exist in the vector store (true
  // catalog gaps — unfixable by retrieval/selection) and report the score both
  // with and without them.
  const catalogNames: string[] = [];
  try {
    const sb = createClient(
      process.env.SUPABASE_URL as string,
      process.env.SUPABASE_ANON_KEY as string,
    );
    let off = 0;
    for (;;) {
      const { data } = await sb
        .from('product_chunks')
        .select('product_name')
        .range(off, off + 999);
      if (!data || data.length === 0) break;
      catalogNames.push(...data.map((d: any) => d.product_name));
      if (data.length < 1000) break;
      off += 1000;
    }
  } catch (e: any) {
    console.log(`(catalog load failed: ${e.message} — gap detection disabled)`);
  }
  const uniqCatalog = [...new Set(catalogNames)];
  const isCatalogGap = (expected: string[]) =>
    uniqCatalog.length > 0 && !uniqCatalog.some((cn) => matches(cn, expected));

  console.log(
    `\nScan regression harness — ${cases.length} cases × ${RUNS} runs (since ${SINCE}, ONLY=${ONLY}) — catalog: ${uniqCatalog.length} products\n`,
  );

  let totalPass = 0;
  let totalRuns = 0;
  const diagTally: Record<string, number> = {};
  let done = 0;

  const report = await pool(cases, CONCURRENCY, async (c) => {
    let b64: string;
    try {
      const buf = await streamToBuffer(await storage.download(c.photoKey));
      b64 = buf.toString('base64');
    } catch (e: any) {
      console.log(`SKIP ${c.label} — photo download failed: ${e.message}`);
      return null;
    }

    const outcomes = await Promise.all(
      Array.from({ length: RUNS }, async (): Promise<RunOutcome> => {
        try {
          return await runOnce({ ias, rag, vs }, b64, c);
        } catch (e: any) {
          return {
            visionName: 'ERROR',
            visionBrand: '',
            certs: [],
            reformulated: e.message,
            retrievedTop: [],
            expectedRank: -1,
            expectedInTop8: false,
            pick: 'ERROR',
            pass: false,
            diagnosis: 'vision',
          };
        }
      }),
    );

    const passes = outcomes.filter((o) => o.pass).length;
    totalPass += passes;
    totalRuns += outcomes.length;
    for (const o of outcomes)
      if (!o.pass) diagTally[o.diagnosis] = (diagTally[o.diagnosis] ?? 0) + 1;

    const gap = isCatalogGap(c.expected);
    const rate = `${passes}/${RUNS}`;
    const icon = passes === RUNS ? '✅' : passes === 0 ? '❌' : '🟨';
    const diagSet = [...new Set(outcomes.filter((o) => !o.pass).map((o) => o.diagnosis))];
    const picks = [...new Set(outcomes.map((o) => o.pick))];
    const cats = [...new Set(outcomes.map((o) => o.category))];
    done++;
    console.log(
      `${icon} ${rate}  [${String(done).padStart(2)}/${cases.length}] ${c.label.padEnd(40)}${gap ? ' 🕳️GAP' : ''} attendu:[${c.expected.join(', ')}]\n` +
        `        picks:[${picks.join(', ')}] cat:[${cats.join(',')}] ${diagSet.length ? 'diag:[' + diagSet.join(',') + ']' : ''}`,
    );

    return {
      label: c.label,
      scanId: c.scanId,
      expected: c.expected,
      forbidden: c.forbidden,
      hadDown: c.hadDown,
      gap,
      passes,
      runs: RUNS,
      outcomes,
    };
  }).then((r) => r.filter(Boolean));

  // Scores: all cases, and excluding true catalog gaps (unfixable by the model).
  const gapCases = report.filter((r: any) => r.gap);
  const gapRuns = gapCases.reduce((s: number, r: any) => s + r.runs, 0);
  const gapPass = gapCases.reduce((s: number, r: any) => s + r.passes, 0);
  const ngRuns = totalRuns - gapRuns;
  const ngPass = totalPass - gapPass;
  const pct = totalRuns ? ((totalPass / totalRuns) * 100).toFixed(1) : '0';
  const pctNoGap = ngRuns ? ((ngPass / ngRuns) * 100).toFixed(1) : '0';
  // Case-level (case passes if majority of its runs pass), excluding gaps.
  const ngCases = report.filter((r: any) => !r.gap);
  const ngCaseFull = ngCases.filter((r: any) => r.passes >= Math.ceil(r.runs / 2)).length;
  console.log('\n' + '━'.repeat(70));
  console.log(`  OVERALL (tous)        : ${totalPass}/${totalRuns} = ${pct}%`);
  console.log(`  HORS trous catalogue  : ${ngPass}/${ngRuns} = ${pctNoGap}%  (${ngCases.length} cas)`);
  console.log(`  Cas OK (majorité, hors trous): ${ngCaseFull}/${ngCases.length} = ${ngCases.length ? ((100 * ngCaseFull) / ngCases.length).toFixed(1) : '0'}%`);
  console.log(`  Trous catalogue (${gapCases.length}): ${gapCases.map((r: any) => r.label.slice(0, 22) + ' → ' + r.expected.join('/')).join(' | ')}`);
  console.log(`  Failure diagnosis tally: ${JSON.stringify(diagTally)}`);
  console.log('━'.repeat(70) + '\n');

  if (OUT) {
    fs.writeFileSync(OUT, JSON.stringify({ meta: { RUNS, SINCE, ONLY, totalPass, totalRuns, pct, pctNoGap, ngPass, ngRuns, gapCount: gapCases.length, diagTally }, report }, null, 2));
    console.log(`Wrote ${OUT}`);
  }

  await app.close();
  process.exit(0);
})();
