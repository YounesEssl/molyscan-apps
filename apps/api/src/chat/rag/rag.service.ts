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

━━━ SOURCES D'INFORMATION (STRICTES) ━━━
- **PRODUITS MOLYDAL** : UNIQUEMENT les fiches techniques fournies dans le contexte ci-dessous. Jamais d'invention, jamais de connaissance générale. Si un produit Molydal n'est pas dans le contexte, il n'existe pas pour toi.
- **PRODUITS CONCURRENTS** : si tu as besoin d'identifier un produit concurrent ou d'obtenir ses caractéristiques (viscosité, additifs, certifications, application), utilise l'outil \`web_search\`. **Ne devine jamais**, ne t'appuie JAMAIS sur tes connaissances générales. Si le web search ne retourne rien d'exploitable, dis-le explicitement.
- **RÈGLE ABSOLUE** : zéro hallucination. Toute info sur un lubrifiant concurrent doit venir d'une recherche web vérifiée ; toute info sur un produit Molydal doit venir du contexte RAG.
- **N'UTILISE LE WEB SEARCH QUE POUR** : identifier/documenter un produit concurrent. Jamais pour répondre à d'autres questions (généralités lubrifiants, Molydal, conseil métier), réponds avec le contexte RAG seul.

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

/**
 * Anthropic's native web search tool. Claude decides autonomously when to
 * invoke it — the system prompt restricts usage to identifying / documenting
 * competitor products only.
 *
 * Cast: the tool is a server-side Anthropic capability. TS types in the
 * current SDK (@anthropic-ai/sdk v0.90) don't yet include it but the wire
 * format is correct.
 */
const WEB_SEARCH_TOOL = {
  type: 'web_search_20250305',
  name: 'web_search',
  max_uses: 3,
} as unknown as Anthropic.ToolUnion;

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
      tools: [WEB_SEARCH_TOOL],
    });

    // When Claude uses the web_search tool, the final text is in the last
    // `text` block of the response content.
    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('\n');
    return { text, sources };
  }

  /**
   * Streaming response for the free chat endpoint.
   * Returns an Anthropic MessageStream.
   */
  async generateStreamingResponse(
    question: string,
    conversationHistory: Array<{ role: string; text: string }>,
    productContext?: {
      scannedName: string | null;
      scannedBrand: string | null;
      molydalName: string | null;
      molydalReference: string | null;
    },
  ): Promise<{
    stream: ReturnType<Anthropic['messages']['stream']>;
    sources: string[];
  }> {
    // When the conversation is attached to a scan, bias retrieval toward the
    // identified Molydal product by enriching the search query with its name.
    const contextualQuestion = productContext?.molydalName
      ? `${question} — à propos de ${productContext.molydalName} (équivalent ${productContext.scannedBrand ?? ''} ${productContext.scannedName ?? ''})`
      : question;

    const reformulated = await this.reformulateQuery(
      contextualQuestion,
      conversationHistory,
    );

    const chunks = await this.vectorStore.dualSearch(
      contextualQuestion,
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

    const productBlock = productContext?.scannedName
      ? `━━━ CONTEXTE DU SCAN ━━━
Produit concurrent scanné : ${productContext.scannedBrand ?? '?'} ${productContext.scannedName}
Équivalent Molydal identifié : ${productContext.molydalName ?? 'non déterminé'}${productContext.molydalReference ? ` (réf. ${productContext.molydalReference})` : ''}

L'utilisateur te questionne spécifiquement sur ce match. Reste centré sur ces deux produits dans tes réponses.

`
      : '';

    const reformulationBlock =
      !productContext && reformulated !== question
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
      system: `${SYSTEM_PROMPT}\n\n${productBlock}${reformulationBlock}Contexte — Fiches techniques Molydal :\n${context}`,
      messages,
      tools: [WEB_SEARCH_TOOL],
    });

    return { stream, sources };
  }
}
