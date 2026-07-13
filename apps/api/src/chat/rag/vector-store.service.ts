import { Injectable, Logger, OnModuleInit, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { EmbeddingService } from './embedding.service';
import { PrismaService } from '../../prisma/prisma.service';

interface ChunkResult {
  product_name: string;
  product_family: string;
  chunk_text: string;
  similarity: number;
  metadata: Record<string, unknown>;
}

/**
 * Optional hard-filters applied client-side after vector retrieval.
 * Each filter narrows the candidate set; null/undefined means no filter.
 */
export interface RetrievalFilters {
  /** Required conditionnement (AEROSOL, TUBE, CARTOUCHE, PULVERISATEUR, JERRYCAN, …). Case-insensitive. */
  format?: string;
  /** Require alimentaire (NSF H1 / food contact) products only. */
  alimentaire?: boolean;
  /** Require eco_responsable products only. */
  ecoResponsable?: boolean;
  /** Restrict to a specific product_family (e.g. "DÉGRAISSANTS", "GRAISSES"). */
  family?: string;
}

// Product names or keyword patterns that are equipment/accessories, not lubricants.
// Returned by the vector store when "P 68", "M", "E" etc. match equipment identifiers.
const EQUIPMENT_PATTERNS = [
  /^PULSARLUBE/i,
  /^POMPE\s+S[ÉE]RIE/i,
  /^KIT\s+DE\s+DISTRIBUTION/i,
  /^RACCORD\s+/i,
  /^FONTAINE\s+FUT/i,
  /^CENTRALE\s+/i,
];

function isEquipment(productName: string): boolean {
  return EQUIPMENT_PATTERNS.some((re) => re.test(productName));
}

// Map normalized format names (from the structured identification) onto the
// raw values found in product_chunks.metadata.conditionnements.
// Liquid forms (bottle/drum/jerrycan/…) are intentionally grouped so the
// filter does not over-constrain — a competitor in a 1 L bottle and its
// Molydal equivalent sold only in jerrycan must still match.
const LIQUID_TOKENS = [
  'FLACON',
  'BIDON',
  'JERRYCAN',
  'FUT',
  'FUT PLASTIQUE',
  'TONNELET',
  'CONTAINER',
  'SEAU',
];
const FORMAT_ALIASES: Record<string, string[]> = {
  aerosol: ['AEROSOL'],
  spray_pump: ['PULVÉRISATEUR', 'PULVERISATEUR', 'AEROSOL'],
  paste_tube: ['TUBE'],
  cartridge: ['CARTOUCHE'],
  liquid_bottle: LIQUID_TOKENS,
  liquid_drum: LIQUID_TOKENS,
  bulk_drum: LIQUID_TOKENS,
};

function getAcceptedFormatTokens(filterFormat: string): string[] {
  const norm = filterFormat.trim().toLowerCase().replace(/\s+/g, '_');
  if (FORMAT_ALIASES[norm]) return FORMAT_ALIASES[norm];
  // fallback: caller may already pass the raw catalog token (e.g. "AEROSOL")
  return [filterFormat.toUpperCase()];
}

function chunkMatchesFilters(
  chunk: ChunkResult,
  filters: RetrievalFilters | undefined,
): boolean {
  if (!filters) return true;
  const meta = chunk.metadata as Record<string, unknown>;
  if (filters.format) {
    const conds = ((meta.conditionnements ?? meta.packaging) as string[] | undefined) ?? [];
    const accepted = getAcceptedFormatTokens(filters.format);
    const ok = conds.some((c) => accepted.includes(c?.toString().toUpperCase()));
    if (!ok) return false;
  }
  if (filters.alimentaire === true && meta.alimentaire !== true && meta.food_grade !== true) return false;
  if (filters.ecoResponsable === true && meta.eco_responsable !== true && meta.eco_responsible !== true) return false;
  if (filters.family && chunk.product_family !== filters.family) return false;
  return true;
}

@Injectable()
export class VectorStoreService implements OnModuleInit {
  private readonly logger = new Logger(VectorStoreService.name);
  private supabase!: SupabaseClient;
  private cohereApiKey: string | null = null;

  constructor(
    private configService: ConfigService,
    private embeddingService: EmbeddingService,
    @Optional() private prisma?: PrismaService,
  ) {}

  onModuleInit() {
    this.supabase = createClient(
      this.configService.getOrThrow<string>('SUPABASE_URL'),
      this.configService.getOrThrow<string>('SUPABASE_ANON_KEY'),
    );
    this.cohereApiKey =
      this.configService.get<string>('COHERE_API_KEY') ?? null;
    if (!this.cohereApiKey) {
      this.logger.warn(
        'COHERE_API_KEY not set — reranker disabled, will fall back to vector ranking only.',
      );
    }
  }

  /**
   * Cohere Rerank — takes top-K candidates from vector retrieval and re-scores
   * them with a cross-encoder for finer precision. Returns the top `topN`
   * reranked chunks. Falls back to identity (input order) on any failure.
   */
  private async rerank(
    query: string,
    chunks: ChunkResult[],
    topN: number,
  ): Promise<ChunkResult[]> {
    if (!this.cohereApiKey || chunks.length === 0) return chunks.slice(0, topN);
    try {
      const documents = chunks.map((c) => c.chunk_text);
      const res = await fetch('https://api.cohere.com/v2/rerank', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${this.cohereApiKey}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'rerank-v3.5',
          query,
          documents,
          top_n: Math.min(topN, chunks.length),
        }),
      });
      if (!res.ok) {
        const body = await res.text();
        this.logger.warn(
          `Cohere rerank HTTP ${res.status}: ${body.slice(0, 200)} — falling back`,
        );
        return chunks.slice(0, topN);
      }
      const json = (await res.json()) as {
        results: Array<{ index: number; relevance_score: number }>;
      };
      const reranked = json.results
        .map((r) => ({ chunk: chunks[r.index], score: r.relevance_score }))
        .filter((x) => !!x.chunk);
      this.logger.log(
        `Reranked ${chunks.length} → ${reranked.length}, top score: ${reranked[0]?.score.toFixed(3) ?? 'n/a'}`,
      );
      // Replace similarity with reranker relevance so downstream sees the
      // reranker's verdict in the % display (helps debugging).
      return reranked.map(({ chunk, score }) => ({ ...chunk, similarity: score }));
    } catch (err) {
      this.logger.warn(
        `Cohere rerank failed: ${(err as Error).message} — falling back`,
      );
      return chunks.slice(0, topN);
    }
  }

  async searchChunks(
    query: string,
    matchCount = 40,
    matchThreshold = 0.2,
  ): Promise<ChunkResult[]> {
    const embedding = await this.embeddingService.generateEmbedding(query);
    if (embedding.length === 0) return [];

    // Prefer the versioned PIM index. The legacy Supabase store remains a
    // temporary fallback until the first validated PIM synchronization.
    if (this.prisma) {
      const active = await this.prisma.ragIndexVersion.findFirst({
        where: { status: 'active' },
        orderBy: { activatedAt: 'desc' },
      });
      if (active) {
        const vector = `[${embedding.join(',')}]`;
        const rows = await this.prisma.$queryRawUnsafe<Array<{
          product_name: string;
          product_family: string | null;
          chunk_text: string;
          similarity: number;
          metadata: Record<string, unknown>;
        }>>(
          `SELECT p."name" AS product_name, p."family" AS product_family,
                  c."content" AS chunk_text,
                  (0.82 * (1 - (c."embedding" <=> $1::vector)) +
                   0.18 * ts_rank_cd(to_tsvector('simple', c."content"), plainto_tsquery('simple', $2)))::float AS similarity,
                  c."metadata" AS metadata
             FROM "rag_chunks" c
             JOIN "pim_products" p ON p."id" = c."productId"
            WHERE c."indexId" = $3
              AND p."active" = true
              AND p."productType" = 'lubricant'
            ORDER BY similarity DESC
            LIMIT $4`,
          vector, query, active.id, matchCount,
        );
        return rows.map((row) => ({ ...row, product_family: row.product_family ?? '' }));
      }
    }

    const { data, error } = await this.supabase.rpc('search_chunks', {
      query_embedding: embedding,
      match_threshold: matchThreshold,
      match_count: matchCount,
      product_filter: null,
    });

    if (error) {
      this.logger.error(`Vector search failed: ${error.message}`);
      return [];
    }

    // Remove equipment/accessories — they are not lubricant equivalents
    return (data as ChunkResult[] ?? []).filter(
      (chunk) => !isEquipment(chunk.product_name),
    );
  }

  /**
   * Dual search: embed both original and reformulated queries,
   * merge and deduplicate results keeping the best similarity score.
   *
   * When `filters` are provided, overfetch (80 chunks per query) and apply
   * hard filters client-side on `metadata.conditionnements`, `metadata.alimentaire`,
   * etc. Falls back gracefully if filtering empties the result set.
   */
  async dualSearch(
    originalQuery: string,
    reformulatedQuery: string,
    filters?: RetrievalFilters,
  ): Promise<ChunkResult[]> {
    const overfetch = filters ? 80 : 40;
    const [directResults, reformulatedResults] = await Promise.all([
      this.searchChunks(originalQuery, overfetch),
      this.searchChunks(reformulatedQuery, overfetch),
    ]);

    // Merge and deduplicate, keeping highest similarity per chunk
    const chunkMap = new Map<string, ChunkResult>();

    for (const chunk of [...directResults, ...reformulatedResults]) {
      const key = `${chunk.product_name}::${chunk.chunk_text.slice(0, 100)}`;
      const existing = chunkMap.get(key);
      if (!existing || chunk.similarity > existing.similarity) {
        chunkMap.set(key, chunk);
      }
    }

    let allChunks = Array.from(chunkMap.values()).sort(
      (a, b) => b.similarity - a.similarity,
    );

    // Regulatory and physical filters are genuinely hard constraints. Returning
    // no candidate is safer than silently recommending an incompatible product.
    if (filters) {
      const filtered = allChunks.filter((c) => chunkMatchesFilters(c, filters));
      this.logger.log(
        `Hard filters applied (${JSON.stringify(filters)}): ${allChunks.length} → ${filtered.length} chunks`,
      );
      allChunks = filtered;
    }

    // Diversity pass: keep one chunk per product so the reranker sees N
    // distinct products and not 4 chunks of the same one. The reranker will
    // then re-score these representative chunks against the actual query.
    const bestPerProduct = new Map<string, ChunkResult>();
    const extras: ChunkResult[] = [];

    for (const chunk of allChunks) {
      if (!bestPerProduct.has(chunk.product_name)) {
        bestPerProduct.set(chunk.product_name, chunk);
      } else {
        extras.push(chunk);
      }
    }

    const candidatesForRerank = Array.from(bestPerProduct.values()).slice(0, 40);

    // The PIM intentionally contains Molydal facts, not competitor aliases.
    // Rerank against the normalized technical intent so a competitor name does
    // not erase otherwise relevant candidates retrieved by their properties.
    const reranked = await this.rerank(reformulatedQuery, candidatesForRerank, 15);

    return [
      ...reranked,
      ...extras
        .filter((c) =>
          reranked.some((p) => p.product_name === c.product_name),
        )
        .slice(0, 15),
    ];
  }
}
