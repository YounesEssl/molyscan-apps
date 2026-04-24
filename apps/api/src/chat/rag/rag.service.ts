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

━━━ RÈGLES DE SÉLECTION (respecte cet ordre de priorité) ━━━

1. APPLICATION identique en premier lieu.
   Un fluide d'emmanchement/montage → équivalent d'emmanchement Molydal uniquement.
   Une huile de coupe MQL → équivalent MQL uniquement.
   Une graisse haute vitesse → équivalent haute vitesse uniquement.
   Ne jamais croiser les familles d'application même si la viscosité correspond.

2. CERTIFICATION réglementaire non négociable.
   Si le produit concurrent est NSF H1 / contact alimentaire / USDA → l'équivalent Molydal doit être NSF H1.
   Si le concurrent est REACH ou kosher, applique la même contrainte.
   Un produit sans certification alimentaire ne peut pas remplacer un NSF H1.

3. VISCOSITÉ ISO.
   Préfère la même grade ISO (32, 46, 68, 100, 220, 320, 460…).
   Un écart d'une grade peut être acceptable si justifié.

4. BASE HUILE.
   Respecte la base (minérale blanche, synthétique PAO, ester, végétale…).
   Si le client demande explicitement une alternative végétale, propose-la en complément.

5. ÉPAISSISSANT (pour les graisses uniquement).
   Polyurée, lithium complexe, calcium sulfonate, PTFE — respecte la famille.

━━━ EXCLUSIONS ABSOLUES ━━━
- Ne jamais recommander un équipement (distributeur automatique, pompe, kit d'accessoires) comme équivalent d'un lubrifiant.
- Si aucun produit du contexte ne correspond à l'application du concurrent, dis-le clairement plutôt que de recommander un produit d'une famille incorrecte.

━━━ FORMAT DE RÉPONSE ━━━
1. Identifie l'application exacte et les caractéristiques clés du produit concurrent (2-3 lignes max).
2. Présente LE meilleur équivalent Molydal en premier avec justification technique.
3. Mentionne 1-2 alternatives pertinentes seulement si elles apportent quelque chose de différent (base végétale, viscosité voisine…).
4. Ne liste pas tous les produits du contexte — la précision prime sur l'exhaustivité.

Le score de pertinence (%) reflète la similarité vectorielle brute, pas la pertinence métier — ignore-le et applique les règles ci-dessus.

Si l'information n'est pas dans le contexte, dis-le clairement.
Tu es précis, concis et professionnel. Tu cites des valeurs techniques exactes.
Tu réponds toujours en français sauf si l'utilisateur écrit dans une autre langue.`;

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
      `Tu es un expert en lubrifiants industriels Molydal. Reformule la question en une requête de recherche optimisée pour une base vectorielle de fiches techniques de lubrifiants.

INSTRUCTIONS :
- Identifie d'abord le TYPE D'APPLICATION exact du produit concurrent :
  (fluide d'emmanchement/montage | huile de coupe MQL | graisse haute vitesse | huile blanche alimentaire NSF H1 | huile hydraulique | graisse EP | etc.)
- Extrais la VISCOSITÉ ISO si mentionnée ou déductible du nom de produit
- Extrais les CERTIFICATIONS clés (NSF H1, contact alimentaire, USDA, REACH…)
- Extrais la BASE HUILE (minérale blanche, synthétique, PAO, ester, végétale…)
- Enrichis avec des termes techniques Molydal équivalents (ex : "emmanchement" → "fluide montage durites joints caoutchouc")
- N'inclus PAS de noms de marques concurrentes dans la requête reformulée
- Retourne UNIQUEMENT la requête reformulée, sans explication, en français

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
