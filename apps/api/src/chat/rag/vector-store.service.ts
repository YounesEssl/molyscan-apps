import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { EmbeddingService } from './embedding.service';

interface ChunkResult {
  product_name: string;
  product_family: string;
  chunk_text: string;
  similarity: number;
  metadata: Record<string, unknown>;
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

@Injectable()
export class VectorStoreService implements OnModuleInit {
  private readonly logger = new Logger(VectorStoreService.name);
  private supabase!: SupabaseClient;

  constructor(
    private configService: ConfigService,
    private embeddingService: EmbeddingService,
  ) {}

  onModuleInit() {
    this.supabase = createClient(
      this.configService.getOrThrow<string>('SUPABASE_URL'),
      this.configService.getOrThrow<string>('SUPABASE_ANON_KEY'),
    );
  }

  async searchChunks(
    query: string,
    matchCount = 40,
    matchThreshold = 0.2,
  ): Promise<ChunkResult[]> {
    const embedding = await this.embeddingService.generateEmbedding(query);
    if (embedding.length === 0) return [];

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
   */
  async dualSearch(
    originalQuery: string,
    reformulatedQuery: string,
  ): Promise<ChunkResult[]> {
    const [directResults, reformulatedResults] = await Promise.all([
      this.searchChunks(originalQuery),
      this.searchChunks(reformulatedQuery),
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

    const allChunks = Array.from(chunkMap.values()).sort(
      (a, b) => b.similarity - a.similarity,
    );

    // Diversity pass: one best chunk per product first, then extra chunks
    const bestPerProduct = new Map<string, ChunkResult>();
    const extras: ChunkResult[] = [];

    for (const chunk of allChunks) {
      if (!bestPerProduct.has(chunk.product_name)) {
        bestPerProduct.set(chunk.product_name, chunk);
      } else {
        extras.push(chunk);
      }
    }

    // 15 unique products (up from 12) to capture more relevant alternatives
    const topProducts = Array.from(bestPerProduct.values()).slice(0, 15);
    return [
      ...topProducts,
      ...extras
        .filter((c) =>
          topProducts.some((p) => p.product_name === c.product_name),
        )
        .slice(0, 15),
    ];
  }
}
