/**
 * RAG Real Integration Eval
 *
 * Reproduit les conversations cassées en appelant la vraie stack :
 *   Gemini (reformulation) → Supabase (vecteurs réels) → Anthropic (réponse)
 *
 * Aucun mock — on teste ce que l'utilisateur voit vraiment.
 * Les sources Supabase sont loguées pour diagnostiquer les problèmes de retrieval.
 *
 * Run: npm run test:eval:real
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
  passed: boolean;
  foundProduct: string | null;
  forbiddenFound: string | null;
  retrievedSources: string[];
  expectedProducts: string[];
  responseHead: string;
}

const results: RealEvalResult[] = [];

afterAll(() => {
  const passed = results.filter((r) => r.passed).length;
  const total = results.length;

  console.log('\n');
  console.log('━'.repeat(72));
  console.log(`  RAG REAL EVAL — ${passed}/${total} passed  (vrai Supabase, vrai LLM)`);
  console.log('━'.repeat(72));

  for (const r of results) {
    const icon = r.passed ? '✅' : '❌';
    console.log(`\n${icon}  ${r.name}`);
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
          console.log(`      → Vérifier le CSV / réindexer ces produits`);
        } else {
          console.log(`   ❌ Produits récupérés mais mal sélectionnés par le LLM`);
          console.log(`      → Ajuster le system prompt`);
        }
      }
      console.log(`   Réponse    : ${r.responseHead}`);
    }
  }

  console.log('\n' + '━'.repeat(72));
  if (passed < total) {
    console.log(`  ${total - passed} cas échoué(s).`);
    console.log(`  Si "Absent du vector store" → corriger le CSV et réindexer.`);
    console.log(`  Si "Mal sélectionné" → ajuster le system prompt puis relancer.`);
  } else {
    console.log('  Tous les cas passent en conditions réelles. 🎉');
  }
  console.log('━'.repeat(72) + '\n');
});

// ─── Suite ───────────────────────────────────────────────────────────────────

describe('RAG Real Eval — stack complète sans mock', () => {
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
  const skipIfMissing = missingVars.length > 0 ? test.skip : test;

  beforeAll(async () => {
    if (missingVars.length > 0) {
      console.warn(`\nSkipping real eval — missing env vars: ${missingVars.join(', ')}`);
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

    // onModuleInit n'est pas appelé automatiquement en test — on l'appelle manuellement
    vectorStore.onModuleInit();
  });

  describe.each(EVAL_CASES)('$name', (evalCase) => {
    skipIfMissing(
      'retourne le bon équivalent avec le vrai vector store',
      async () => {
        // ── 1. Reformulation (Gemini) + retrieval (Supabase réel) ──
        const reformulated = await (ragService as any).reformulateQuery(
          evalCase.query,
          [],
        );
        console.log(`\n  [${evalCase.name}]`);
        console.log(`  Requête originale  : "${evalCase.query}"`);
        console.log(`  Requête reformulée : "${reformulated}"`);

        const chunks = await vectorStore.dualSearch(evalCase.query, reformulated);
        const retrievedSources = [...new Set(chunks.map((c) => c.product_name))];
        console.log(`  Sources Supabase   : ${retrievedSources.join(', ') || '(aucune)'}`);

        // ── 2. Génération (Anthropic réel) ──
        const result = await ragService.generateResponse({
          question: evalCase.query,
          conversationHistory: [],
        });

        const found = containsAny(result.text, evalCase.expectedProducts);
        const forbidden = containsForbidden(result.text, evalCase.forbiddenProducts ?? []);
        const passed = !!found && !forbidden;

        results.push({
          name: evalCase.name,
          passed,
          foundProduct: found,
          forbiddenFound: forbidden,
          retrievedSources,
          expectedProducts: evalCase.expectedProducts,
          responseHead: result.text.slice(0, 200).replace(/\n/g, ' '),
        });

        if (forbidden) {
          expect(forbidden).toBeNull();
        }
        expect(found).not.toBeNull();
      },
      90_000,
    );
  });
});
