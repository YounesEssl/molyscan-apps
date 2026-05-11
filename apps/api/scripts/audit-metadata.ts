import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { createClient } from '@supabase/supabase-js';

async function main(): Promise<void> {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
  );
  const all: Array<{ product_name: string; metadata: any }> = [];
  let offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from('product_chunks')
      .select('product_name, metadata')
      .range(offset, offset + 999);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < 1000) break;
    offset += 1000;
  }
  console.log(`\nTotal rows: ${all.length}`);

  // Distinct values per metadata key
  const valuesByKey = new Map<string, Map<string, number>>();
  for (const row of all) {
    const meta = row.metadata ?? {};
    for (const [k, v] of Object.entries(meta)) {
      if (!valuesByKey.has(k)) valuesByKey.set(k, new Map());
      const inner = valuesByKey.get(k)!;
      const key =
        v === null
          ? '(null)'
          : Array.isArray(v)
            ? JSON.stringify(v)
            : typeof v === 'object'
              ? JSON.stringify(v)
              : String(v);
      inner.set(key, (inner.get(key) ?? 0) + 1);
    }
  }

  for (const [k, vals] of valuesByKey.entries()) {
    console.log(`\n--- ${k} (${vals.size} distinct values) ---`);
    const sorted = [...vals.entries()].sort((a, b) => b[1] - a[1]);
    for (const [val, n] of sorted.slice(0, 12)) {
      console.log(`  ${n.toString().padStart(4)}  ${val}`);
    }
    if (sorted.length > 12) console.log(`  ... and ${sorted.length - 12} more`);
  }

  // Show distinct conditionnements unrolled
  const condCount = new Map<string, number>();
  for (const row of all) {
    const list = (row.metadata?.conditionnements ?? []) as string[];
    for (const c of list) condCount.set(c, (condCount.get(c) ?? 0) + 1);
  }
  console.log(`\n=== Unrolled conditionnements (${condCount.size} distinct) ===`);
  for (const [c, n] of [...condCount.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${n.toString().padStart(4)}  ${c}`);
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
