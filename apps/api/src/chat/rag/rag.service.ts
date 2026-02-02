import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VectorStoreService } from './vector-store.service';

interface RagInput {
  question: string;
  conversationHistory: Array<{ role: 'user' | 'assistant'; text: string }>;
  productContext: {
    scannedName: string;
    scannedBrand: string;
    molydalName: string;
    molydalReference: string;
  };
}

interface RagOutput {
  text: string;
  sources: string[];
}

const SYSTEM_PROMPT = `Tu es l'assistant technique Molydal. Tu aides les commerciaux et distributeurs à comprendre les produits Molydal et leurs équivalences avec les produits concurrents. Tu réponds uniquement à partir des fiches techniques Molydal fournies dans le contexte. Si tu ne trouves pas l'information, dis-le clairement. Cite toujours tes sources (références de fiches techniques). Réponds en français.`;

@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);
  private readonly baseUrl: string;
  private readonly model: string;

  constructor(
    private configService: ConfigService,
    private vectorStore: VectorStoreService,
  ) {
    this.baseUrl = this.configService.get<string>('OLLAMA_BASE_URL', 'http://localhost:11434');
    this.model = this.configService.get<string>('OLLAMA_MODEL', 'mistral');
  }

  async generateResponse(input: RagInput): Promise<RagOutput> {
    // 1. Search relevant documents via vector store
    const relevantDocs = await this.vectorStore.similaritySearch(
      `${input.productContext.molydalReference} ${input.question}`,
      5,
    );

    // 2. Build context from retrieved docs
    const docsContext = relevantDocs.length > 0
      ? relevantDocs.map((d) => `[Source: ${d.source}]\n${d.content}`).join('\n\n')
      : `Produit concurrent: ${input.productContext.scannedName} (${input.productContext.scannedBrand})\nÉquivalent Molydal: ${input.productContext.molydalName} (Réf: ${input.productContext.molydalReference})`;

    // 3. Build messages array
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'system', content: `Contexte technique:\n${docsContext}` },
      ...input.conversationHistory.map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.text,
      })),
      { role: 'user', content: input.question },
    ];

    // 4. Call Ollama
    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          messages,
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama error: ${response.statusText}`);
      }

      const data = await response.json() as { message: { content: string } };
      const text = data.message.content;

      // Extract sources from the response text and docs
      const sources = relevantDocs.map((d) => d.source);
      if (sources.length === 0) {
        sources.push(`FT-${input.productContext.molydalReference}`);
      }

      return { text, sources: [...new Set(sources)] };
    } catch (error) {
      this.logger.warn(`Ollama not available: ${error}. Using fallback response.`);
      return this.fallbackResponse(input);
    }
  }

  private fallbackResponse(input: RagInput): RagOutput {
    return {
      text: `D'après nos fiches techniques, le ${input.productContext.molydalName} (Réf: ${input.productContext.molydalReference}) est l'équivalent recommandé pour le ${input.productContext.scannedName} de ${input.productContext.scannedBrand}. Je vous recommande de consulter la fiche technique pour les spécifications détaillées. [Note: Le service IA est temporairement indisponible, cette réponse est générée automatiquement.]`,
      sources: [`FT-${input.productContext.molydalReference}`],
    };
  }
}
