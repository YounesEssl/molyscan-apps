import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });
import { createClient } from '@supabase/supabase-js';

async function main(): Promise<void> {
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);
  // Get all distinct products in TRAVAIL DES MÉTAUX family
  const { data } = await supabase
    .from('product_chunks')
    .select('product_name, metadata')
    .eq('product_family', 'TRAVAIL DES MÉTAUX');
  const map = new Map<string, any>();
  for (const r of data ?? []) map.set(r.product_name, r.metadata);
  console.log(`TRAVAIL DES MÉTAUX — ${map.size} produits distincts:`);
  for (const [name, meta] of [...map.entries()].sort()) {
    const conds = (meta?.conditionnements ?? []).join(', ');
    console.log(`  ${name.padEnd(22)} [${conds}]`);
  }
}
main().catch(console.error);
