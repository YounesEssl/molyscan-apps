import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { createClient } from '@supabase/supabase-js';

async function main(): Promise<void> {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
  );
  const families: string[] = [];
  let offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from('product_chunks')
      .select('product_family')
      .range(offset, offset + 999);
    if (error) throw error;
    if (!data || data.length === 0) break;
    families.push(...data.map((d) => d.product_family as string).filter(Boolean));
    if (data.length < 1000) break;
    offset += 1000;
  }
  const counts = new Map<string, number>();
  for (const f of families) counts.set(f, (counts.get(f) ?? 0) + 1);
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  console.log(`\n${sorted.length} familles distinctes :\n`);
  for (const [name, n] of sorted) console.log(`  ${n.toString().padStart(4)}  ${name}`);
}
main().catch(console.error);
