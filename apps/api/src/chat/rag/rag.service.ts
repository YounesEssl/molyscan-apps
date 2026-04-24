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

━━━ SOURCES D'INFORMATION ━━━
- Pour identifier et caractériser le PRODUIT CONCURRENT : utilise tes connaissances générales sur les lubrifiants industriels (tu connais les gammes des grands fabricants — Klüber, Fuchs, Cimcool, TotalEnergies, Henkel, Quaker Houghton, etc.).
- Pour recommander l'ÉQUIVALENT MOLYDAL : base-toi UNIQUEMENT sur les fiches techniques fournies dans le contexte. Ne recommande jamais un produit Molydal qui n'est pas dans le contexte.

━━━ RÈGLES DE SÉLECTION (respecte cet ordre de priorité) ━━━

1. APPLICATION identique en premier lieu.
   Identifie d'abord avec précision l'application du produit concurrent :
   fluide d'emmanchement/montage | huile de coupe MQL | huile évaporante (vanishing oil) | graisse haute vitesse | huile blanche alimentaire | huile hydraulique | huile de déformation | etc.
   L'équivalent Molydal doit avoir la MÊME application. Ne jamais croiser les familles :
   - Un fluide d'emmanchement ne peut pas être remplacé par une huile de coupe, ni par une huile de déformation.
   - Une huile blanche minérale (USAGOL AL, H 125 AL) ≠ une huile hydraulique (HYDRO série) même si les deux ont une certification NSF H1.
   - Une huile évaporante alimentaire (MYE …AL) ≠ une huile évaporante industrielle (MYE sans AL).

2. CERTIFICATION réglementaire non négociable.
   NSF H1 / contact alimentaire / USDA → l'équivalent Molydal doit être NSF H1.
   Un produit sans certification alimentaire ne remplace jamais un NSF H1.

3. VISCOSITÉ ISO.
   Préfère la même grade ISO (32, 46, 68, 100, 220, 320, 460…).

4. BASE HUILE.
   Respecte la base (minérale blanche, synthétique PAO, ester, végétale…).
   Si le client demande une alternative végétale, propose-la en complément.

5. ÉPAISSISSANT (graisses uniquement).
   Respecte la famille : polyurée, lithium complexe, calcium sulfonate, PTFE.

━━━ EXCLUSIONS ABSOLUES ━━━
- Ne jamais recommander un équipement (distributeur automatique, pompe, kit) comme équivalent d'un lubrifiant.
- Si aucun produit du contexte ne correspond à l'application correcte, dis-le clairement. Ne recommande pas un produit d'une famille incorrecte par défaut.

━━━ FORMAT DE RÉPONSE ━━━
1. Identifie l'application exacte et les caractéristiques clés du produit concurrent (2-3 lignes).
2. Présente LE meilleur équivalent Molydal du contexte en premier avec justification technique.
3. Mentionne 1-2 alternatives pertinentes du contexte si elles apportent une valeur différente.
4. Ne liste pas tous les produits — la précision prime.

Le score de pertinence (%) est une similarité vectorielle brute, pas une pertinence métier — ignore-le.
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
      // Disable extended thinking for this simple reformulation task
      generationConfig: {
        maxOutputTokens: 400,
        temperature: 0,
        thinkingConfig: { thinkingBudget: 0 },
      } as any,
    });
    const response = await model.generateContent(
      `Tu es un expert en lubrifiants industriels. Traduis le nom du produit concurrent en une requête de recherche technique pour trouver son équivalent Molydal.

SORTIE ATTENDUE : uniquement les termes de recherche, sans explication, sans ponctuation finale, en français.

Exemples :
- "Klüber ISOFLEX NBU 15" → graisse polyurée haute vitesse roulements synthétique basse viscosité
- "Fuchs RENOFORM DSW 1002" → fluide synthétique aqueux déformation à froid emboutissage prêt emploi
- "Cimcool P80" → fluide emmanchement montage aqueux durites joints caoutchouc
- "Bonderite L-FM L67" → huile évaporante NSF H1 alimentaire emboutissage léger découpage
- "Klüber Paraliq P 68" → huile blanche minérale NSF H1 ISO 68 contact alimentaire
- "TotalEnergies Ceran XM 460" → graisse calcium sulfonate extrême pression haute température ISO 460

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

    // Include the reformulated description so the LLM uses a pre-validated product
    // characterization rather than potentially incorrect pretrained knowledge.
    const productDescription =
      reformulated !== input.question
        ? `Application identifiée du produit concurrent : ${reformulated}\n\n`
        : '';

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
      system: `${SYSTEM_PROMPT}\n\n${productDescription}Contexte — Fiches techniques Molydal :\n${context}`,
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

    const productDescription =
      reformulated !== question
        ? `Application identifiée du produit concurrent : ${reformulated}\n\n`
        : '';

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
      system: `${SYSTEM_PROMPT}\n\n${productDescription}Contexte — Fiches techniques Molydal :\n${context}`,
      messages,
    });

    return { stream, sources };
  }
}
