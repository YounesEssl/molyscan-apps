/**
 * Check whether a list of Molydal product names is present in the Supabase
 * search_chunks table (distinct product_name).
 *
 * Run: cd apps/api && npx ts-node scripts/check-catalog.ts
 * Requires: SUPABASE_URL, SUPABASE_ANON_KEY in apps/api/.env
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { createClient } from '@supabase/supabase-js';

const PRODUCTS_TO_CHECK = [
  'GR PTFE AL',
  'AGL 75 AL',
  'KL 9 H',
  'STARNET+',
  'GRAISSE 3790',
  'CONTACTOL NF',
  'PROTEC NF',
  'MO/3',
  'MO 3',
  'STAREX',
  'VGCUT',
  'SCA 200',
  'PW 30 AL',
  'SOLESTER 530 M',
  'LCH 350',
  'FILLMORE AL',
  'VASELINE TECHNIQUE',
];

function normalize(s: string): string {
  return s.toLowerCase().replace(/[\s/\-_.]+/g, ' ').trim();
}

async function main(): Promise<void> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.error('Missing SUPABASE_URL / SUPABASE_ANON_KEY in apps/api/.env');
    process.exit(1);
  }

  const supabase = createClient(url, key);

  // search_chunks is an RPC. Try common table names that hold the actual chunks.
  const candidateTables = ['chunks', 'documents', 'product_chunks', 'embeddings'];
  let tableName = '';
  let probeRows: any[] = [];
  for (const t of candidateTables) {
    const { data, error } = await supabase.from(t).select('*').limit(1);
    if (!error && data) {
      tableName = t;
      probeRows = data;
      console.log(`Found table: ${t}, sample row keys: ${Object.keys(data[0] ?? {}).join(', ')}`);
      break;
    } else if (error) {
      console.log(`  not "${t}" (${error.message})`);
    }
  }
  if (!tableName) {
    console.error('No known chunks table found — list one manually.');
    process.exit(1);
  }
  // Identify the product-name column
  const productCol = ['product_name', 'name', 'productName'].find(
    (c) => c in (probeRows[0] ?? {}),
  );
  if (!productCol) {
    console.error(`No product_name column in ${tableName}. Columns: ${Object.keys(probeRows[0] ?? {}).join(', ')}`);
    process.exit(1);
  }

  let allProducts: string[] = [];
  const batchSize = 1000;
  let offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from(tableName)
      .select(productCol)
      .range(offset, offset + batchSize - 1);
    if (error) {
      console.error('Supabase error:', error.message);
      process.exit(1);
    }
    if (!data || data.length === 0) break;
    allProducts.push(...data.map((d: any) => d[productCol] as string));
    if (data.length < batchSize) break;
    offset += batchSize;
  }

  const unique = [...new Set(allProducts)];
  console.log(`\nTotal rows pulled: ${allProducts.length}`);
  console.log(`Distinct product names: ${unique.length}\n`);
  console.log('━'.repeat(70));

  for (const target of PRODUCTS_TO_CHECK) {
    const normTarget = normalize(target);
    const matches = unique.filter((name) =>
      normalize(name).includes(normTarget),
    );
    if (matches.length > 0) {
      console.log(`✅  ${target.padEnd(22)} → ${matches.join(', ')}`);
    } else {
      // Try a fuzzy partial match (first 4 chars)
      const head = normTarget.split(' ')[0].slice(0, 4);
      const fuzzy = unique.filter((name) => normalize(name).startsWith(head));
      console.log(`❌  ${target.padEnd(22)} → NOT FOUND${fuzzy.length ? ` (fuzzy: ${fuzzy.slice(0, 5).join(', ')})` : ''}`);
    }
  }
  console.log('━'.repeat(70) + '\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
