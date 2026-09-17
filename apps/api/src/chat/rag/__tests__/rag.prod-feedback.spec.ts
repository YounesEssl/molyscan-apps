/**
 * Prod feedback eval — replays the 19 conversation_submissions extracted from
 * production (minus 3 out-of-scope cases) against the real stack.
 *
 * No mocks: Gemini reformulation → current PIM index → Gemini generation.
 * Each case reports whether retrieval recalled the expected product and whether
 * the model selected it as the recommendation.
 *
 * Run: npm run test:prod-feedback
 * Requires: GEMINI_API_KEY, OPENAI_API_KEY, DATABASE_URL
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { RagService } from '../rag.service';
import { VectorStoreService } from '../vector-store.service';
import { EmbeddingService } from '../embedding.service';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  PROD_FEEDBACK_CASES,
  PROD_FEEDBACK_OUT_OF_SCOPE,
  ProdFeedbackCase,
} from './prod-feedback.fixtures';

interface CaseResult {
  name: string;
  status: 'running' | 'completed' | 'error' | 'incomplete';
  error?: string;
  type: 'product' | 'free';
  passed: boolean;
  foundProduct: string | null;
  forbiddenFound: string | null;
  retrievedSources: string[];
  expectedProducts: string[];
  responseHead: string;
  diagnosis: 'retrieval' | 'selection' | 'pass' | null;
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

function markInterruptedCases(): void {
  for (const result of results) {
    if (result.status !== 'running') continue;
    result.status = 'incomplete';
    result.error = 'Test interrompu avant réception de la réponse complète (timeout ou arrêt du test).';
  }
}

afterEach(markInterruptedCases);

afterAll(() => {
  markInterruptedCases();
  const passed = results.filter((r) => r.status === 'completed' && r.passed).length;
  const total = results.length;
  const completed = results.filter((r) => r.status === 'completed').length;
  const errors = results.filter((r) => r.status === 'error').length;
  const incomplete = results.filter((r) => r.status === 'incomplete').length;
  const retrievalMisses = results.filter((r) => r.diagnosis === 'retrieval').length;
  const selectionMisses = results.filter((r) => r.diagnosis === 'selection').length;

  console.log('\n');
  console.log('━'.repeat(78));
  console.log(`  PROD FEEDBACK EVAL — ${passed}/${total} passed`);
  console.log(`  ${total} tentés · ${completed} terminés (réponse reçue) · ${errors} erreurs · ${incomplete} incomplets`);
  if (total === 0) console.log('  Aucun cas tenté : vérifier la configuration ou le filtre de tests.');
  console.log('━'.repeat(78));
  console.log(`  Retrieval misses (produit attendu absent du contexte PIM) : ${retrievalMisses}`);
  console.log(`  Selection misses (produit récupéré mais ignoré par le LLM) : ${selectionMisses}`);
  console.log('━'.repeat(78));

  for (const r of results) {
    const icon = r.passed ? '✅' : '❌';
    console.log(`\n${icon}  [${r.type}] ${r.name} [${r.status}]`);
    if (r.status !== 'completed') {
      console.log(`   ${r.status === 'error' ? 'ERREUR' : 'INCOMPLET'} : ${r.error}`);
      if (r.responseHead) console.log(`   Réponse partielle : ${r.responseHead}`);
      continue;
    }
    console.log(`   Attendu  : ${r.expectedProducts.join(' | ')}`);
    console.log(`   Sources  : ${r.retrievedSources.slice(0, 10).join(', ') || '(aucune)'}`);

    if (r.passed) {
      console.log(`   Trouvé   : ${r.foundProduct}`);
    } else {
      if (r.forbiddenFound) {
        console.log(`   ⚠️  Produit interdit recommandé : "${r.forbiddenFound}"`);
      }
      if (r.diagnosis === 'retrieval') {
        console.log(`   ❌ RETRIEVAL : aucun produit attendu n'a été récupéré dans le contexte PIM`);
        console.log(`      → Données PIM / filtres / réindexation à vérifier`);
      } else if (r.diagnosis === 'selection') {
        console.log(`   ❌ SELECTION : le LLM n'a pas sélectionné le bon produit malgré récupération OK`);
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
  let module: TestingModule | undefined;

  const requiredEnvVars = [
    'GEMINI_API_KEY',
    'OPENAI_API_KEY',
    'DATABASE_URL',
  ];
  const missingVars = requiredEnvVars.filter((v) => !process.env[v]);
  const runIf = missingVars.length > 0 ? test.skip : test;

  beforeAll(async () => {
    if (missingVars.length > 0) {
      console.warn(`\nSkipping prod-feedback eval — missing env: ${missingVars.join(', ')}`);
      return;
    }

    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: path.resolve(__dirname, '../../../../.env'),
        }),
      ],
      providers: [RagService, VectorStoreService, EmbeddingService, PrismaService],
    }).compile();

    ragService = module.get<RagService>(RagService);
    const vectorStore = module.get<VectorStoreService>(VectorStoreService);
    vectorStore.onModuleInit();
  });

  afterAll(async () => { await module?.close(); });

  describe.each(PROD_FEEDBACK_CASES)('$name', (testCase: ProdFeedbackCase) => {
    runIf(
      'reproduit le retour utilisateur',
      async () => {
        const entry: CaseResult = {
          name: testCase.name, type: testCase.type, status: 'running', passed: false,
          foundProduct: null, forbiddenFound: null, retrievedSources: [],
          expectedProducts: testCase.expectedProducts, responseHead: '', diagnosis: null,
        };
        results.push(entry);
        try {
          // Build the SAME filters the streaming call will use, so the diagnostic
          // `retrievedSources` reflects what the model actually sees.
          const filtersForDisplay = testCase.simulatedScan
            ? {
                ...(testCase.simulatedScan.format
                  ? { format: testCase.simulatedScan.format }
                  : {}),
                ...(testCase.simulatedScan.alimentaire
                  ? { alimentaire: true as const }
                  : {}),
                ...(testCase.simulatedScan.nsfCategory
                  ? { nsfCategory: testCase.simulatedScan.nsfCategory }
                  : {}),
                ...(testCase.simulatedScan.ecoResponsable
                  ? { ecoResponsable: true as const }
                  : {}),
              }
            : undefined;
          // Use streaming endpoint to mirror the actual prod code path. We consume
          // the async iterable of text deltas to assemble the full response.
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
          if (entry.status !== 'running') return;
          entry.retrievedSources = sources;
          let resultText = '';
          for await (const delta of stream) {
            if (entry.status !== 'running') return;
            resultText += delta;
            entry.responseHead = resultText.slice(0, 500).replace(/\n/g, ' ');
          }
          if (entry.status !== 'running') return;
          // Diagnose the actual generation context, not a second independent search.
          const retrievedSources = sources;

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

          Object.assign(entry, {
            status: 'completed',
            passed,
            foundProduct: found,
            forbiddenFound: forbidden,
            retrievedSources,
            expectedProducts: testCase.expectedProducts,
            responseHead: resultText.slice(0, 500).replace(/\n/g, ' '),
            diagnosis,
          });

        } catch (error) {
          if (entry.status === 'running') {
            entry.status = 'error';
            entry.error = error instanceof Error ? error.message : String(error);
          }
          throw error;
        }

        // We don't fail the run on individual case misses — the goal is to MEASURE.
        // Uncomment below once you want CI to gate on these.
        // if (forbidden) expect(forbidden).toBeNull();
        // expect(found).not.toBeNull();
      },
      120_000,
    );
  });
});
