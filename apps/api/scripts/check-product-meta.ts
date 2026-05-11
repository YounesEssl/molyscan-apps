import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { createClient } from '@supabase/supabase-js';

const PRODUCTS = ['GRAISSE 3790', 'STAREX SC', 'SCA 200', 'PROTEC NF', 'CONTACTOL NF', 'STARNET+', 'KL 9 H', 'MO/3', 'AGL 75 AL', 'GR PTFE AL'];

async function main(): Promise<void> {
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);
  for (const name of PRODUCTS) {
    const { data } = await supabase
      .from('product_chunks')
      .select('product_name, product_family, metadata')
      .eq('product_name', name)
      .limit(1);
    const row = data?.[0];
    if (!row) {
      console.log(`❌  ${name}: NOT FOUND`);
      continue;
    }
    const m = row.metadata as any;
    console.log(`\n${name}  family=${row.product_family}`);
    console.log(`  conditionnements: ${JSON.stringify(m.conditionnements)}`);
    console.log(`  alimentaire: ${m.alimentaire}  eco: ${m.eco_responsable}  nsf: ${m.nsf_categorie}`);
  }
}
main().catch(console.error);
