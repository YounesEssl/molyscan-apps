/**
 * Inspect product_chunks to find which Molydal products mention each
 * competitor brand/model in their chunk_text — those are the cross-references
 * that enable retrieval-by-brand.
 *
 * Run: cd apps/api && npx ts-node scripts/check-cross-refs.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { createClient } from '@supabase/supabase-js';

const COMPETITOR_QUERIES = [
  { brand: 'Klüberfluid', model: 'NH1 CM 4-100', expected: 'GR PTFE AL' },
  { brand: 'Klüberfood', model: 'NH1 94-402', expected: 'AGL 75 AL' },
  { brand: 'Eco Degreaser', model: 'INTERFLON', expected: 'KL 9 H' },
  { brand: 'Bardahl', model: 'Nettoyant freins', expected: 'STARNET+' },
  { brand: 'WD-40', model: 'Specialist Graisse', expected: 'GRAISSE 3790' },
  { brand: 'CRC', model: 'Contact Cleaner', expected: 'CONTACTOL NF' },
  { brand: 'Aerodag', model: 'Ceramishield', expected: 'PROTEC NF' },
  { brand: 'Molykote', model: 'BR-2', expected: 'MO/3' },
  { brand: 'Jelt', model: 'Huile de Coupe', expected: 'STAREX' },
  { brand: 'Modat', model: 'Millenium', expected: 'SCA 200' },
  { brand: 'Interflon', model: 'Paste HT1200', expected: 'PW 30 AL' },
  { brand: 'Igol', model: 'Usinov 2675', expected: 'SOLESTER 530 M' },
  { brand: 'Igol', model: 'SHP 50 C', expected: 'GRAISSE 3790' },
  { brand: 'Elkalub', model: 'LA-8P', expected: 'FILLMORE AL' },
  { brand: 'Bérulube', model: 'PV DAB', expected: 'VASELINE TECHNIQUE' },
];

async function main(): Promise<void> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.error('Missing Supabase env');
    process.exit(1);
  }
  const supabase = createClient(url, key);

  console.log(`\n${'━'.repeat(90)}`);
  console.log('  Cross-reference audit: which chunks mention each competitor?');
  console.log(`${'━'.repeat(90)}\n`);

  for (const { brand, model, expected } of COMPETITOR_QUERIES) {
    const tokens = [brand, model];
    for (const token of tokens) {
      const { data, error } = await supabase
        .from('product_chunks')
        .select('product_name, chunk_text')
        .ilike('chunk_text', `%${token}%`)
        .limit(5);

      if (error) {
        console.log(`  ❌ Error for "${token}": ${error.message}`);
        continue;
      }
      const hits = data ?? [];
      const productsMentioning = [...new Set(hits.map((h) => h.product_name))];
      const expectedIsThere = productsMentioning.some((p) =>
        p.toLowerCase().includes(expected.toLowerCase().replace(/[\s/]/g, '')) ||
        expected.toLowerCase().includes(p.toLowerCase()),
      );
      const icon = expectedIsThere ? '✅' : productsMentioning.length > 0 ? '⚠️ ' : '❌';
      console.log(
        `${icon}  "${token.padEnd(20)}" → ${productsMentioning.length} chunk(s) | expected="${expected}" | in chunks: ${productsMentioning.slice(0, 6).join(', ')}`,
      );
    }
    console.log('');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
