/**
 * Re-embed all chunks IN PLACE without modifying chunk_text.
 *
 * Use case: we want to test whether the embedding model itself was the issue,
 * keeping the new structured chunks unchanged.
 *
 * Run:
 *   cd apps/api && npx ts-node scripts/reembed-only.ts --model text-embedding-3-small
 *   cd apps/api && npx ts-node scripts/reembed-only.ts --model text-embedding-3-large --dims 1536
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const modelIdx = args.indexOf('--model');
  const model =
    modelIdx >= 0 ? args[modelIdx + 1] : 'text-embedding-3-small';
  const dimsIdx = args.indexOf('--dims');
  const dimensions =
    dimsIdx >= 0 ? parseInt(args[dimsIdx + 1], 10) : undefined;

  console.log(`Re-embedding with model=${model}${dimensions ? ` dims=${dimensions}` : ''}`);

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
  );
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

  // Fetch all chunks
  const all: Array<{ id: string; product_name: string; chunk_text: string; metadata: any }> = [];
  let offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from('product_chunks')
      .select('id, product_name, chunk_text, metadata')
      .range(offset, offset + 999);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    all.push(...(data as any));
    if (data.length < 1000) break;
    offset += 1000;
  }
  console.log(`${all.length} chunks to re-embed.\n`);

  let done = 0;
  let failed = 0;
  const t0 = Date.now();
  for (const c of all) {
    try {
      const params: any = { model, input: c.chunk_text };
      if (dimensions) params.dimensions = dimensions;
      const res = await openai.embeddings.create(params);
      const embedding = res.data[0].embedding;
      const newMeta = { ...c.metadata, embedding_model: model + (dimensions ? `@${dimensions}` : '') };
      const { error } = await supabase
        .from('product_chunks')
        .update({ embedding, metadata: newMeta })
        .eq('id', c.id);
      if (error) throw new Error(error.message);
      done++;
      if (done % 50 === 0) {
        const elapsed = ((Date.now() - t0) / 1000).toFixed(0);
        console.log(`[${done}/${all.length}] ${c.product_name} (${elapsed}s)`);
      }
    } catch (err) {
      failed++;
      console.error(`✗ ${c.product_name}: ${(err as Error).message}`);
    }
  }
  console.log(`\nDone. Re-embedded: ${done}, failed: ${failed}.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
