import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EmbeddingService } from './embedding.service';

@Injectable()
export class VectorStoreService {
  private readonly logger = new Logger(VectorStoreService.name);

  constructor(
    private prisma: PrismaService,
    private embeddingService: EmbeddingService,
  ) {}

  async similaritySearch(query: string, topK = 5): Promise<Array<{ content: string; source: string }>> {
    const embedding = await this.embeddingService.generateEmbedding(query);

    if (embedding.length === 0) {
      this.logger.warn('Empty embedding, returning empty results');
      return [];
    }

    try {
      const results = await this.prisma.$queryRawUnsafe<
        Array<{ content: string; source: string; distance: number }>
      >(
        `SELECT content, source, embedding <=> $1::vector AS distance
         FROM document_embeddings
         ORDER BY distance ASC
         LIMIT $2`,
        `[${embedding.join(',')}]`,
        topK,
      );
      return results;
    } catch (error) {
      this.logger.warn(`Vector search failed: ${error}`);
      return [];
    }
  }

  async upsertDocument(content: string, source: string, metadata?: Record<string, unknown>) {
    const embedding = await this.embeddingService.generateEmbedding(content);
    if (embedding.length === 0) return;

    await this.prisma.$executeRawUnsafe(
      `INSERT INTO document_embeddings (id, content, source, metadata, embedding, "createdAt")
       VALUES (gen_random_uuid(), $1, $2, $3, $4::vector, NOW())`,
      content,
      source,
      JSON.stringify(metadata || {}),
      `[${embedding.join(',')}]`,
    );
  }
}
