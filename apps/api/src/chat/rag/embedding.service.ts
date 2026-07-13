import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  private readonly openai: OpenAI;

  constructor(private configService: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.configService.getOrThrow<string>('OPENAI_API_KEY'),
    });
  }

  get model(): string {
    return this.configService.get('RAG_EMBEDDING_MODEL', 'text-embedding-3-small');
  }

  get dimensions(): number {
    return Number(this.configService.get('RAG_EMBEDDING_DIMENSIONS', '1536'));
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: this.model,
        input: text,
        dimensions: this.dimensions,
      });
      return response.data[0].embedding;
    } catch (error) {
      this.logger.error(`Embedding generation failed: ${error}`);
      return [];
    }
  }
}
