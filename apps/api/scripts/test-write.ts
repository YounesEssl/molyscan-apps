import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { createClient } from '@supabase/supabase-js';

async function main(): Promise<void> {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
  );
  // Fetch one row to get an id
  const { data: rows } = await supabase
    .from('product_chunks')
    .select('id, product_name, metadata')
    .limit(1);
  if (!rows || !rows[0]) {
    console.log('No rows found');
    return;
  }
  const row = rows[0];
  console.log('Test row id:', row.id, 'product:', row.product_name);
  console.log('Current metadata:', row.metadata);

  // Try a write: append a test key to metadata
  const newMeta = { ...(row.metadata as Record<string, unknown> || {}), _write_test: 'ok' };
  const { data: updated, error } = await supabase
    .from('product_chunks')
    .update({ metadata: newMeta })
    .eq('id', row.id)
    .select();
  if (error) {
    console.log('❌ WRITE BLOCKED:', error.message);
    return;
  }
  console.log('✅ Write succeeded:', updated?.[0]?.metadata);

  // Revert
  await supabase
    .from('product_chunks')
    .update({ metadata: row.metadata })
    .eq('id', row.id);
  console.log('Reverted.');
}
main().catch((e) => { console.error(e); process.exit(1); });
