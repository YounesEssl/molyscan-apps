/**
 * Rollback step 2 of the re-chunking workflow.
 *
 * Restores chunk_text from metadata.original_text and re-embeds with the
 * ORIGINAL model (text-embedding-3-small) so the catalog returns to its
 * pre-rechunking state. The reranker can still be used on top.
 *
 * Run:
 *   cd apps/api && npx ts-node scripts/rollback-chunks.ts --dry-run
 *   cd apps/api && npx ts-node scripts/rollback-chunks.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

interface ChunkRow {
  id: string;
  product_name: string;
  chunk_text: string;
  metadata: Record<string, any>;
}

async function fetchAllChunks(supabase: any): Promise<ChunkRow[]> {
  const out: ChunkRow[] = [];
  let offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from('product_chunks')
      .select('id, product_name, chunk_text, metadata')
      .range(offset, offset + 999);
    if (error) throw new Error(`fetch: ${error.message}`);
    if (!data || data.length === 0) break;
    out.push(...(data as any));
    if (data.length < 1000) break;
    offset += 1000;
  }
  return out;
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
  );
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

  console.log('Fetching chunks…');
  const chunks = await fetchAllChunks(supabase);
  console.log(`${chunks.length} chunks total.`);

  let restored = 0;
  let skippedNoBackup = 0;
  let failed = 0;
  const t0 = Date.now();

  for (const c of chunks) {
    const original = c.metadata?.original_text as string | undefined;
    if (!original) {
      skippedNoBackup++;
      continue;
    }
    if (dryRun) {
      restored++;
      if (restored <= 2) {
        console.log(
          `[DRY] ${c.product_name}: restore from ${c.chunk_text.slice(0, 60)}…  →  ${original.slice(0, 60)}…`,
        );
      }
      continue;
    }
    try {
      const res = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: original,
      });
      const embedding = res.data[0].embedding;
      // Strip rechunk markers from metadata; keep original_text as safety net.
      const newMetadata: Record<string, any> = { ...c.metadata };
      delete newMetadata.rechunk_version;
      delete newMetadata.embedding_model;
      const { error } = await supabase
        .from('product_chunks')
        .update({ chunk_text: original, embedding, metadata: newMetadata })
        .eq('id', c.id);
      if (error) throw new Error(error.message);
      restored++;
      if (restored % 50 === 0) {
        const elapsed = ((Date.now() - t0) / 1000).toFixed(0);
        console.log(`[${restored}] ${c.product_name} (${elapsed}s)`);
      }
    } catch (err) {
      failed++;
      console.error(`✗ ${c.product_name}: ${(err as Error).message}`);
    }
  }
  console.log(
    `\nDone. Restored: ${restored}, skipped (no backup): ${skippedNoBackup}, failed: ${failed}.`,
  );
  if (dryRun) console.log('[DRY RUN] No writes performed.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
