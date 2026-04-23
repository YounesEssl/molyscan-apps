import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { VectorStoreService } from './vector-store.service';

interface RagInput {
  question: string;
  conversationHistory: Array<{ role: 'user' | 'assistant'; text: string }>;
  productContext?: {
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

const SYSTEM_PROMPT = `Tu es l'assistant IA de Molydal, expert en lubrifiants industriels.
Tu réponds aux questions en te basant UNIQUEMENT sur les fiches techniques fournies dans le contexte.

IMPORTANT — Comment recommander des produits :
1. Analyse TOUS les produits du contexte et identifie celui qui correspond LE MIEUX à la demande du client.
2. Commence TOUJOURS par recommander LE meilleur produit en premier, en expliquant POURQUOI il est le plus adapté.
3. Tu peux ensuite mentionner 1-2 alternatives pertinentes, mais en expliquant en quoi elles sont moins idéales.
4. Ne liste PAS tous les produits possibles — privilégie la précision à l'exhaustivité.
5. Compare les produits entre eux sur les critères clés de la demande.

Le score de pertinence (%) est basé sur la similarité sémantique brute et peut être trompeur — fais ta propre analyse.

Si l'information n'est pas dans le contexte, dis-le clairement.
Tu es précis, concis et professionnel. Tu cites des valeurs techniques exactes.
Tu réponds toujours en français sauf si l'utilisateur écrit dans une autre langue.
Quand tu recommandes un produit, mentionne toujours son nom exact et ses caractéristiques clés.`;

@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);
  private readonly anthropic: Anthropic;
  private readonly gemini: GoogleGenerativeAI;

  constructor(
    private configService: ConfigService,
    private vectorStore: VectorStoreService,
  ) {
    this.anthropic = new Anthropic({
      apiKey: this.configService.getOrThrow<string>('ANTHROPIC_API_KEY'),
    });
    this.gemini = new GoogleGenerativeAI(
      this.configService.getOrThrow<string>('GEMINI_API_KEY'),
    );
  }

  /**
   * Reformulate user query for better vector search.
   */
  async reformulateQuery(
    question: string,
    conversationHistory: Array<{ role: string; text: string }>,
  ): Promise<string> {
    const recentContext = conversationHistory.slice(-4);
    const contextStr = recentContext.length
      ? recentContext
          .map(
            (m) =>
              `${m.role === 'user' ? 'Client' : 'Assistant'}: ${m.text}`,
          )
          .join('\n')
      : '';

    const prompt = contextStr
      ? `Contexte de la conversation :\n${contextStr}\n\nNouvelle question du client : ${question}`
      : `Question du client : ${question}`;

    const model = this.gemini.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: { maxOutputTokens: 300, temperature: 0 },
    });
    const response = await model.generateContent(
      `Tu es un expert en lubrifiants industriels Molydal. Reformule la question en une requête de recherche optimisée pour une base vectorielle de fiches techniques.
Extrais les critères techniques implicites et explicites. Enrichis avec des synonymes techniques pertinents.
Retourne UNIQUEMENT la requête reformulée, sans explication. En français.

${prompt}`,
    );

    return response.response.text()?.trim() || question;
  }

  /**
   * Non-streaming response (for product-linked conversations).
   */
  async generateResponse(input: RagInput): Promise<RagOutput> {
    const reformulated = await this.reformulateQuery(
      input.question,
      input.conversationHistory,
    );

    const chunks = await this.vectorStore.dualSearch(
      input.question,
      reformulated,
    );

    const context =
      chunks.length > 0
        ? chunks
            .map(
              (c) =>
                `[${c.product_name}] (pertinence: ${(c.similarity * 100).toFixed(0)}%)\n${c.chunk_text}`,
            )
            .join('\n\n---\n\n')
        : 'Aucune fiche technique pertinente trouvée.';

    const sources = [...new Set(chunks.map((c) => c.product_name))];

    const messages: Anthropic.MessageParam[] = [
      ...input.conversationHistory.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.text,
      })),
      { role: 'user' as const, content: input.question },
    ];

    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      temperature: 0.3,
      system: `${SYSTEM_PROMPT}\n\nContexte — Fiches techniques Molydal :\n${context}`,
      messages,
    });

    const text =
      response.content[0].type === 'text' ? response.content[0].text : '';
    return { text, sources };
  }

  /**
   * Streaming response for the free chat endpoint.
   * Returns an Anthropic MessageStream.
   */
  async generateStreamingResponse(
    question: string,
    conversationHistory: Array<{ role: string; text: string }>,
  ): Promise<{
    stream: ReturnType<Anthropic['messages']['stream']>;
    sources: string[];
  }> {
    const reformulated = await this.reformulateQuery(
      question,
      conversationHistory,
    );

    const chunks = await this.vectorStore.dualSearch(question, reformulated);

    const context =
      chunks.length > 0
        ? chunks
            .map(
              (c) =>
                `[${c.product_name}] (pertinence: ${(c.similarity * 100).toFixed(0)}%)\n${c.chunk_text}`,
            )
            .join('\n\n---\n\n')
        : 'Aucune fiche technique pertinente trouvée.';

    const sources = [...new Set(chunks.map((c) => c.product_name))];

    const validHistory = conversationHistory.filter((m) => m.text.trim());
    const messages: Anthropic.MessageParam[] = [
      ...validHistory.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.text,
      })),
      { role: 'user' as const, content: question },
    ];

    const stream = this.anthropic.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      temperature: 0.3,
      system: `${SYSTEM_PROMPT}\n\nContexte — Fiches techniques Molydal :\n${context}`,
      messages,
    });

    return { stream, sources };
  }
}
