/**
 * Step 1 of the re-chunking workflow.
 *
 * For each distinct product in `product_chunks`, ask Claude Sonnet to produce
 * a compact, search-optimized STRUCTURED HEADER summarizing the product's
 * application family, format, certifications, thickener, use cases, and key
 * features. The header is written to disk (one JSON file under
 * `apps/api/scripts/.cache/headers.json`) so step 2 can apply it without
 * paying for LLM calls again.
 *
 * Idempotent: re-running skips products already present in the cache.
 *
 * Run:
 *   cd apps/api && npx ts-node scripts/rechunk-step1-headers.ts [--limit N]
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

const CACHE_DIR = path.resolve(__dirname, '.cache');
const CACHE_FILE = path.join(CACHE_DIR, 'headers.json');

interface CachedHeader {
  header: string;
  generatedAt: string;
  productFamily: string;
  numChunks: number;
}

interface ProductGroup {
  productName: string;
  productFamily: string;
  metadata: Record<string, unknown>;
  combinedText: string;
  numChunks: number;
}

function loadCache(): Record<string, CachedHeader> {
  if (!fs.existsSync(CACHE_FILE)) return {};
  return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
}

function saveCache(cache: Record<string, CachedHeader>): void {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), 'utf8');
}

async function fetchProductGroups(): Promise<ProductGroup[]> {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
  );
  const all: Array<{
    product_name: string;
    product_family: string;
    chunk_text: string;
    metadata: Record<string, unknown>;
  }> = [];
  let offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from('product_chunks')
      .select('product_name, product_family, chunk_text, metadata')
      .range(offset, offset + 999);
    if (error) throw new Error(`Supabase: ${error.message}`);
    if (!data || data.length === 0) break;
    all.push(...(data as any));
    if (data.length < 1000) break;
    offset += 1000;
  }

  const groups = new Map<string, ProductGroup>();
  for (const row of all) {
    const key = row.product_name;
    const existing = groups.get(key);
    if (!existing) {
      groups.set(key, {
        productName: row.product_name,
        productFamily: row.product_family,
        metadata: row.metadata ?? {},
        combinedText: row.chunk_text,
        numChunks: 1,
      });
    } else {
      existing.combinedText += '\n\n' + row.chunk_text;
      existing.numChunks += 1;
    }
  }
  return [...groups.values()].sort((a, b) =>
    a.productName.localeCompare(b.productName),
  );
}

function buildPrompt(group: ProductGroup): string {
  return `You are an expert in industrial lubricants. Generate a search-optimized STRUCTURED HEADER for the Molydal product below. This header will be prepended to each chunk of the product so that vector embeddings retrieve it when a user searches for a competitor product of similar profile.

Product name: ${group.productName}
Catalog family: ${group.productFamily}
Existing metadata: ${JSON.stringify(group.metadata)}

Datasheet content (combined chunks):
"""
${group.combinedText.slice(0, 6000)}
"""

Generate the header EXACTLY in this format, with each field on its own line, in ENGLISH, no markdown fences, no extra explanation, no introduction. Be concise: each field on a single line.

APPLICATION: <one specific application family — e.g. "semi-dry lubricant with PTFE solid additive for food-grade contact" or "neat cutting oil for metalworking machining" or "anti-spatter ceramic dry-film spray for welding">
FORMAT: <physical form factor — e.g. "aerosol can", "cartridge for centralized greasing", "liquid drum / jerrycan", "tube paste">
CERTIFICATIONS: <visible certifications — e.g. "NSF H1 food-grade, USDA" or "eco-responsible biodegradable" or "none">
THICKENER: <for greases only: lithium / lithium complex / calcium / calcium complex / calcium sulfonate / calcium anhydrous / polyurea / PTFE / MoS2 / bentonite / aluminum complex. For non-greases write "n/a">
TEMPERATURE: <operating range — e.g. "-30°C to +180°C" or "ambient">
USE CASES: <3-5 typical applications — e.g. "food industry bearings, conveyors, packaging machines, light pumps">
KEY FEATURES: <3-5 distinguishing features — e.g. "high water resistance, marine grade, EP additives, low evaporation">
EQUIVALENT TO: <generic competitor product types this replaces — describe by CATEGORY, NOT brand names — e.g. "generic aerosol multipurpose grease sprays, light food-grade lubricant aerosols" or "neat cutting oils for steel/aluminum machining">`;
}

async function generateHeader(
  anthropic: Anthropic,
  group: ProductGroup,
): Promise<string> {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 400,
    temperature: 0,
    messages: [{ role: 'user', content: buildPrompt(group) }],
  });
  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim();
  return text;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const limitIdx = args.indexOf('--limit');
  const limit =
    limitIdx >= 0 ? parseInt(args[limitIdx + 1], 10) : Number.POSITIVE_INFINITY;

  console.log('Loading product groups from Supabase…');
  const groups = await fetchProductGroups();
  console.log(`Found ${groups.length} distinct products.\n`);

  const cache = loadCache();
  const cachedCount = Object.keys(cache).length;
  console.log(`Cache: ${cachedCount} products already have headers.\n`);

  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY!,
  });

  let processed = 0;
  let skipped = 0;
  let failed = 0;
  const t0 = Date.now();

  for (const group of groups) {
    if (processed >= limit) break;
    if (cache[group.productName]) {
      skipped++;
      continue;
    }
    try {
      const header = await generateHeader(anthropic, group);
      cache[group.productName] = {
        header,
        generatedAt: new Date().toISOString(),
        productFamily: group.productFamily,
        numChunks: group.numChunks,
      };
      processed++;
      if (processed % 5 === 0) saveCache(cache);
      const elapsed = ((Date.now() - t0) / 1000).toFixed(0);
      console.log(
        `[${processed + skipped}/${groups.length}] ✓ ${group.productName}  (${elapsed}s elapsed)`,
      );
    } catch (err) {
      failed++;
      console.error(
        `[${processed + skipped + failed}/${groups.length}] ✗ ${group.productName}: ${(err as Error).message}`,
      );
    }
  }

  saveCache(cache);
  console.log(
    `\nDone. Generated: ${processed}, skipped (cached): ${skipped}, failed: ${failed}.`,
  );
  console.log(`Cache file: ${CACHE_FILE}`);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
