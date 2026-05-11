/**
 * Prod feedback eval — replays the 19 conversation_submissions extracted from
 * production (minus 3 out-of-scope cases) against the real stack.
 *
 * No mocks: Gemini reformulation → Supabase vectors → Anthropic generation.
 * Each case reports whether retrieval recalled the expected product and whether
 * Claude selected it as the recommendation.
 *
 * Run: npm run test:prod-feedback
 * Requires: ANTHROPIC_API_KEY, GEMINI_API_KEY, OPENAI_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { RagService } from '../rag.service';
import { VectorStoreService } from '../vector-store.service';
import { EmbeddingService } from '../embedding.service';
import {
  PROD_FEEDBACK_CASES,
  PROD_FEEDBACK_OUT_OF_SCOPE,
  ProdFeedbackCase,
} from './prod-feedback.fixtures';

interface CaseResult {
  name: string;
  type: 'product' | 'free';
  passed: boolean;
  foundProduct: string | null;
  forbiddenFound: string | null;
  retrievedSources: string[];
  expectedProducts: string[];
  responseHead: string;
  diagnosis: 'retrieval' | 'selection' | 'pass';
}

// Normalize product names so MO/3, MO 3, MO-3 all match the same token.
// Collapses any run of [space, /, -, _, .] into a single space.
function normalize(s: string): string {
  return s.toLowerCase().replace(/[\s/\-_.]+/g, ' ').trim();
}

function matchAny(text: string, products: string[]): string | null {
  const normText = normalize(text);
  return (
    products.find((p) => normText.includes(normalize(p))) ?? null
  );
}

function matchForbidden(text: string, products: string[]): string | null {
  if (!products?.length) return null;
  const head = normalize(text.slice(0, 400));
  return products.find((p) => head.includes(normalize(p))) ?? null;
}

const results: CaseResult[] = [];

afterAll(() => {
  const passed = results.filter((r) => r.passed).length;
  const total = results.length;
  const retrievalMisses = results.filter((r) => r.diagnosis === 'retrieval').length;
  const selectionMisses = results.filter((r) => r.diagnosis === 'selection').length;

  console.log('\n');
  console.log('━'.repeat(78));
  console.log(`  PROD FEEDBACK EVAL — ${passed}/${total} passed`);
  console.log('━'.repeat(78));
  console.log(`  Retrieval misses (produit attendu absent de Supabase) : ${retrievalMisses}`);
  console.log(`  Selection misses (produit récupéré mais ignoré par Claude) : ${selectionMisses}`);
  console.log('━'.repeat(78));

  for (const r of results) {
    const icon = r.passed ? '✅' : '❌';
    console.log(`\n${icon}  [${r.type}] ${r.name}`);
    console.log(`   Attendu  : ${r.expectedProducts.join(' | ')}`);
    console.log(`   Sources  : ${r.retrievedSources.slice(0, 10).join(', ') || '(aucune)'}`);

    if (r.passed) {
      console.log(`   Trouvé   : ${r.foundProduct}`);
    } else {
      if (r.forbiddenFound) {
        console.log(`   ⚠️  Produit interdit recommandé : "${r.forbiddenFound}"`);
      }
      if (r.diagnosis === 'retrieval') {
        console.log(`   ❌ RETRIEVAL : aucun produit attendu n'a été récupéré par Supabase`);
        console.log(`      → CSV / réindexation à vérifier`);
      } else if (r.diagnosis === 'selection') {
        console.log(`   ❌ SELECTION : Claude n'a pas sélectionné le bon produit malgré récupération OK`);
        console.log(`      → System prompt / règles de priorité à ajuster`);
      }
      console.log(`   Réponse  : ${r.responseHead}`);
    }
  }

  console.log('\n' + '━'.repeat(78));
  console.log(`  Cas exclus (non RAG-fixables) : ${PROD_FEEDBACK_OUT_OF_SCOPE.join(', ')}`);
  console.log('━'.repeat(78) + '\n');
});

describe('RAG Prod Feedback Eval — 19 retours conversations remontés (16 testés)', () => {
  let ragService: RagService;
  let vectorStore: VectorStoreService;

  const requiredEnvVars = [
    'ANTHROPIC_API_KEY',
    'GEMINI_API_KEY',
    'OPENAI_API_KEY',
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
  ];
  const missingVars = requiredEnvVars.filter((v) => !process.env[v]);
  const runIf = missingVars.length > 0 ? test.skip : test;

  beforeAll(async () => {
    if (missingVars.length > 0) {
      console.warn(`\nSkipping prod-feedback eval — missing env: ${missingVars.join(', ')}`);
      return;
    }

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: path.resolve(__dirname, '../../../../.env'),
        }),
      ],
      providers: [RagService, VectorStoreService, EmbeddingService],
    }).compile();

    ragService = module.get<RagService>(RagService);
    vectorStore = module.get<VectorStoreService>(VectorStoreService);
    vectorStore.onModuleInit();
  });

  describe.each(PROD_FEEDBACK_CASES)('$name', (testCase: ProdFeedbackCase) => {
    runIf(
      'reproduit le retour utilisateur',
      async () => {
        const reformulated = await (ragService as any).reformulateQuery(
          testCase.query,
          [],
        );
        // Build the SAME filters the streaming call will use, so the diagnostic
        // `retrievedSources` reflects what Claude actually sees.
        const filtersForDisplay = testCase.simulatedScan
          ? {
              ...(testCase.simulatedScan.format
                ? { format: testCase.simulatedScan.format }
                : {}),
              ...(testCase.simulatedScan.alimentaire
                ? { alimentaire: true as const }
                : {}),
              ...(testCase.simulatedScan.ecoResponsable
                ? { ecoResponsable: true as const }
                : {}),
            }
          : undefined;
        const chunks = await vectorStore.dualSearch(
          testCase.query,
          reformulated,
          filtersForDisplay && Object.keys(filtersForDisplay).length > 0
            ? filtersForDisplay
            : undefined,
        );
        const retrievedSources = [...new Set(chunks.map((c) => c.product_name))];

        // Use streaming endpoint to mirror the actual prod code path. We consume
        // the stream synchronously via finalMessage() to assemble the text.
        const { stream, sources } = await ragService.generateStreamingResponse(
          testCase.query,
          [],
          testCase.productContext
            ? {
                scannedName: testCase.productContext.scannedName,
                scannedBrand: testCase.productContext.scannedBrand,
                molydalName: null,
                molydalReference: null,
              }
            : undefined,
          undefined,
          filtersForDisplay && Object.keys(filtersForDisplay).length > 0
            ? filtersForDisplay
            : undefined,
        );
        const finalMessage = await stream.finalMessage();
        const resultText = finalMessage.content
          .filter((b: any) => b.type === 'text')
          .map((b: any) => b.text as string)
          .join('\n');
        void sources;

        const found = matchAny(resultText, testCase.expectedProducts);
        const forbidden = matchForbidden(resultText, testCase.forbiddenProducts ?? []);
        const passed = !!found && !forbidden;

        // Diagnosis: was the expected product even retrieved? Normalize so MO/3 ≈ MO 3.
        const retrieved = testCase.expectedProducts.some((p) => {
          const normP = normalize(p);
          return retrievedSources.some((s) => normalize(s).includes(normP));
        });
        const diagnosis: CaseResult['diagnosis'] = passed
          ? 'pass'
          : retrieved
            ? 'selection'
            : 'retrieval';

        results.push({
          name: testCase.name,
          type: testCase.type,
          passed,
          foundProduct: found,
          forbiddenFound: forbidden,
          retrievedSources,
          expectedProducts: testCase.expectedProducts,
          responseHead: resultText.slice(0, 500).replace(/\n/g, ' '),
          diagnosis,
        });

        // We don't fail the run on individual case misses — the goal is to MEASURE.
        // Uncomment below once you want CI to gate on these.
        // if (forbidden) expect(forbidden).toBeNull();
        // expect(found).not.toBeNull();
      },
      120_000,
    );
  });
});
