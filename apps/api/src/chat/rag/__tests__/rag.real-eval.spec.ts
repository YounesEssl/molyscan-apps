/**
 * RAG Real Integration Eval
 *
 * Reproduit les conversations cassées en appelant la vraie stack :
 *   Gemini (reformulation) → PostgreSQL / index PIM réel → Gemini (réponse)
 *
 * Aucun mock — on teste ce que l'utilisateur voit vraiment.
 * Les sources de la réponse sont loguées : aucun second retrieval de diagnostic.
 *
 * Run: npm run test:eval:real
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
import { EVAL_CASES } from './eval.fixtures';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function containsAny(text: string, products: string[]): string | null {
  const lower = text.toLowerCase();
  return products.find((p) => lower.includes(p.toLowerCase())) ?? null;
}

function containsForbidden(text: string, products: string[]): string | null {
  if (!products?.length) return null;
  const head = text.toLowerCase().slice(0, 400);
  return products.find((p) => head.includes(p.toLowerCase())) ?? null;
}

// ─── Report ──────────────────────────────────────────────────────────────────

interface RealEvalResult {
  name: string;
  status: 'running' | 'completed' | 'error' | 'incomplete';
  error?: string;
  passed: boolean;
  foundProduct: string | null;
  forbiddenFound: string | null;
  retrievedSources: string[];
  expectedProducts: string[];
  responseHead: string;
}

const results: RealEvalResult[] = [];

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

  console.log('\n');
  console.log('━'.repeat(72));
  console.log(`  RAG REAL EVAL — ${passed}/${total} passed  (vrai index PIM, vrai LLM)`);
  console.log(`  ${total} tentés · ${completed} terminés (réponse reçue) · ${errors} erreurs · ${incomplete} incomplets`);
  console.log('━'.repeat(72));

  for (const r of results) {
    const icon = r.passed ? '✅' : '❌';
    console.log(`\n${icon}  ${r.name} [${r.status}]`);
    if (r.status !== 'completed') {
      console.log(`   ${r.status === 'error' ? 'ERREUR' : 'INCOMPLET'} : ${r.error}`);
      continue;
    }
    console.log(`   Attendu    : ${r.expectedProducts.join(' | ')}`);
    console.log(`   Sources DB : ${r.retrievedSources.join(', ') || '(aucune)'}`);

    if (r.passed) {
      console.log(`   Trouvé     : ${r.foundProduct}`);
    } else {
      if (r.forbiddenFound) {
        console.log(`   ⚠️  Produit interdit en tête : "${r.forbiddenFound}"`);
      }
      if (!r.foundProduct) {
        const missing = r.expectedProducts.filter(
          (p) => !r.retrievedSources.some((s) => s.toLowerCase().includes(p.toLowerCase())),
        );
        if (missing.length) {
          console.log(`   ❌ Absents du vector store  : ${missing.join(', ')}`);
          console.log(`      → Vérifier le PIM / réindexer ces produits`);
        } else {
          console.log(`   ❌ Produits récupérés mais mal sélectionnés par le LLM`);
          console.log(`      → Ajuster le system prompt`);
        }
      }
      console.log(`   Réponse    : ${r.responseHead}`);
    }
  }

  console.log('\n' + '━'.repeat(72));
  if (total === 0) {
    console.log('  Aucun cas tenté : vérifier la configuration ou le filtre de tests.');
  } else if (passed < total) {
    console.log(`  ${completed - passed} résultat(s) incorrect(s), ${errors} erreur(s), ${incomplete} cas incomplet(s).`);
    console.log(`  Si "Absent du vector store" → vérifier le PIM et réindexer.`);
    console.log(`  Si "Mal sélectionné" → ajuster le system prompt puis relancer.`);
  } else {
    console.log('  Tous les cas passent en conditions réelles. 🎉');
  }
  console.log('━'.repeat(72) + '\n');
});

// ─── Suite ───────────────────────────────────────────────────────────────────

describe('RAG Real Eval — stack complète sans mock', () => {
  let ragService: RagService;
  let module: TestingModule | undefined;

  const requiredEnvVars = [
    'GEMINI_API_KEY',
    'OPENAI_API_KEY',
    'DATABASE_URL',
  ];
  const missingVars = requiredEnvVars.filter((v) => !process.env[v]);
  const skipIfMissing = missingVars.length > 0 ? test.skip : test;

  beforeAll(async () => {
    if (missingVars.length > 0) {
      console.warn(`\nSkipping real eval — missing env vars: ${missingVars.join(', ')}`);
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

    // onModuleInit n'est pas appelé automatiquement en test — on l'appelle manuellement
    vectorStore.onModuleInit();
  });

  afterAll(async () => { await module?.close(); });

  describe.each(EVAL_CASES)('$name', (evalCase) => {
    skipIfMissing(
      'retourne le bon équivalent avec le vrai vector store',
      async () => {
        // Register before the first await so rejected or timed-out cases remain in the report.
        const entry: RealEvalResult = {
          name: evalCase.name, status: 'running', passed: false,
          foundProduct: null, forbiddenFound: null, retrievedSources: [],
          expectedProducts: evalCase.expectedProducts, responseHead: '',
        };
        results.push(entry);
        try {
          console.log(`\n  [${evalCase.name}]`);
          console.log(`  Requête originale : "${evalCase.query}"`);
          const result = await ragService.generateResponse({
            question: evalCase.query,
            conversationHistory: [],
          });
          // Jest timeouts do not cancel the underlying promise. A late reply must
          // not turn an already reported incomplete case into a success.
          if (entry.status !== 'running') return;
          const found = containsAny(result.text, evalCase.expectedProducts);
          const forbidden = containsForbidden(result.text, evalCase.forbiddenProducts ?? []);
          Object.assign(entry, {
            status: 'completed', passed: !!found && !forbidden,
            foundProduct: found, forbiddenFound: forbidden,
            retrievedSources: result.sources,
            responseHead: result.text.slice(0, 200).replace(/\n/g, ' '),
          });
          console.log(`  Sources index PIM : ${result.sources.join(', ') || '(aucune)'}`);
        } catch (error) {
          if (entry.status === 'running') {
            entry.status = 'error';
            entry.error = error instanceof Error ? error.message : String(error);
          }
          throw error;
        }
        const { foundProduct: found, forbiddenFound: forbidden } = entry;

        if (forbidden) {
          expect(forbidden).toBeNull();
        }
        expect(found).not.toBeNull();
      },
      90_000,
    );
  });
});
