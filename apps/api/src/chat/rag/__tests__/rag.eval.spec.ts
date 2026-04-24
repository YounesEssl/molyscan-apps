/**
 * RAG Eval Suite — reproduces the broken conversations from the JSON files
 * and verifies the improved system prompt + retrieval fixes produce correct answers.
 *
 * Strategy:
 *   - VectorStoreService.dualSearch is mocked with controlled chunks (eval.fixtures.ts)
 *     so we test LLM *selection* quality independently of retrieval quality.
 *   - EmbeddingService and Gemini reformulation use real API calls so we also
 *     validate the reformulation prompt improvement.
 *   - Anthropic is called with temperature 0 for reproducibility.
 *
 * Run:
 *   npm run test:eval
 *
 * Requires env vars: ANTHROPIC_API_KEY, GEMINI_API_KEY, OPENAI_API_KEY
 * (values are read from apps/api/.env at runtime via dotenv)
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env before anything else
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RagService } from '../rag.service';
import { VectorStoreService } from '../vector-store.service';
import { EmbeddingService } from '../embedding.service';
import { EVAL_CASES, EvalCase, MockChunk } from './eval.fixtures';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function containsAny(text: string, products: string[]): string | null {
  const lower = text.toLowerCase();
  return (
    products.find((p) => lower.includes(p.toLowerCase())) ?? null
  );
}

function containsForbidden(text: string, products: string[]): string | null {
  if (!products?.length) return null;
  const lower = text.toLowerCase();
  // "forbidden" only if it appears as a primary recommendation (first 400 chars)
  const head = lower.slice(0, 400);
  return products.find((p) => head.includes(p.toLowerCase())) ?? null;
}

// ─── Eval reporter ───────────────────────────────────────────────────────────

interface EvalResult {
  case: string;
  passed: boolean;
  foundProduct: string | null;
  forbiddenFound: string | null;
  sources: string[];
  responseHead: string;
}

const results: EvalResult[] = [];

afterAll(() => {
  const passed = results.filter((r) => r.passed).length;
  const total = results.length;

  console.log('\n');
  console.log('━'.repeat(70));
  console.log(`  RAG EVAL RESULTS — ${passed}/${total} passed`);
  console.log('━'.repeat(70));

  for (const r of results) {
    const icon = r.passed ? '✅' : '❌';
    console.log(`\n${icon} ${r.case}`);
    if (r.passed) {
      console.log(`   Produit trouvé : ${r.foundProduct}`);
      console.log(`   Sources : ${r.sources.join(', ')}`);
    } else {
      if (r.forbiddenFound) {
        console.log(`   ⚠️  Produit interdit recommandé en tête : "${r.forbiddenFound}"`);
      }
      if (!r.foundProduct) {
        console.log(`   Aucun produit attendu trouvé dans la réponse`);
      }
      console.log(`   Sources récupérées : ${r.sources.join(', ')}`);
      console.log(`   Début de réponse : ${r.responseHead}`);
    }
  }

  console.log('\n' + '━'.repeat(70));
  if (passed < total) {
    console.log(
      `  ${total - passed} cas échoué(s) — ajuste le system prompt ou les fixtures et relance.`,
    );
  } else {
    console.log('  Tous les cas sont passés. 🎉');
  }
  console.log('━'.repeat(70) + '\n');
});

// ─── Test suite ──────────────────────────────────────────────────────────────

describe('RAG Eval — Équivalences produits Molydal', () => {
  let ragService: RagService;
  let mockDualSearch: jest.SpyInstance;

  const skipIfNoKeys =
    !process.env.ANTHROPIC_API_KEY || !process.env.GEMINI_API_KEY
      ? test.skip
      : test;

  beforeAll(async () => {
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
    const vectorStore = module.get<VectorStoreService>(VectorStoreService);

    // We control what the vector store returns so we isolate LLM selection quality
    mockDualSearch = jest
      .spyOn(vectorStore, 'dualSearch')
      .mockImplementation(async () => [] as MockChunk[]);
  });

  afterEach(() => {
    mockDualSearch.mockReset();
  });

  describe.each(EVAL_CASES)(
    '$name',
    (evalCase: EvalCase) => {
      skipIfNoKeys(
        'sélectionne le bon équivalent Molydal',
        async () => {
          mockDualSearch.mockResolvedValue(evalCase.chunks);

          const result = await ragService.generateResponse({
            question: evalCase.query,
            conversationHistory: [],
          });

          const found = containsAny(result.text, evalCase.expectedProducts);
          const forbidden = containsForbidden(
            result.text,
            evalCase.forbiddenProducts ?? [],
          );

          const passed = !!found && !forbidden;

          results.push({
            case: evalCase.name,
            passed,
            foundProduct: found,
            forbiddenFound: forbidden,
            sources: result.sources,
            responseHead: result.text.slice(0, 200).replace(/\n/g, ' '),
          });

          // Assertion with readable message
          if (forbidden) {
            expect(forbidden).toBeNull(); // will fail with the forbidden product name
          }
          expect(found).not.toBeNull();
        },
        60_000,
      );
    },
  );
});

// ─── Additional regression: equipment filter ─────────────────────────────────

describe('VectorStoreService — filtre équipements', () => {
  let vectorStore: VectorStoreService;
  let embeddingService: EmbeddingService;

  const RAW_DATA = [
    { product_name: 'PULSARLUBE M', product_family: 'Équipements', chunk_text: '...', similarity: 0.8, metadata: {} },
    { product_name: 'H 125 AL', product_family: 'Huiles blanches', chunk_text: '...', similarity: 0.6, metadata: {} },
    { product_name: 'POMPE SÉRIE 77 / 180 KG', product_family: 'Équipements', chunk_text: '...', similarity: 0.55, metadata: {} },
    { product_name: 'KIT DE DISTRIBUTION', product_family: 'Équipements', chunk_text: '...', similarity: 0.52, metadata: {} },
    { product_name: 'H VG', product_family: 'Huiles végétales', chunk_text: '...', similarity: 0.5, metadata: {} },
  ];

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: path.resolve(__dirname, '../../../../.env'),
        }),
      ],
      providers: [VectorStoreService, EmbeddingService],
    }).compile();

    vectorStore = module.get<VectorStoreService>(VectorStoreService);
    embeddingService = module.get<EmbeddingService>(EmbeddingService);

    // Mock embedding to avoid real OpenAI call
    jest
      .spyOn(embeddingService, 'generateEmbedding')
      .mockResolvedValue(new Array(1536).fill(0.1));

    // Mock the Supabase client at the instance level so searchChunks runs its real filter
    (vectorStore as any).supabase = {
      rpc: jest.fn().mockResolvedValue({ data: RAW_DATA, error: null }),
    };
  });

  test('searchChunks filtre PULSARLUBE, POMPE SÉRIE et KIT DE DISTRIBUTION', async () => {
    const results = await (vectorStore as any).searchChunks('Klüber Paraliq P 68');
    const names = results.map((r: any) => r.product_name);

    expect(names).not.toContain('PULSARLUBE M');
    expect(names).not.toContain('POMPE SÉRIE 77 / 180 KG');
    expect(names).not.toContain('KIT DE DISTRIBUTION');
    expect(names).toContain('H 125 AL');
    expect(names).toContain('H VG');
  });
});
