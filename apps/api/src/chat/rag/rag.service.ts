import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { VectorStoreService, RetrievalFilters } from './vector-store.service';
import type { AttachmentEntry } from '../attachment.store';

interface RagInput {
  question: string;
  conversationHistory: Array<{ role: 'user' | 'assistant'; text: string }>;
  productContext?: {
    scannedName: string;
    scannedBrand: string;
    molydalName: string;
    molydalReference: string;
  };
  /** Optional hard filters applied to vector retrieval. */
  retrievalFilters?: RetrievalFilters;
}

interface RagOutput {
  text: string;
  sources: string[];
}

const SYSTEM_PROMPT = `You are the Molydal AI assistant, an expert in industrial lubricants.

━━━ LANGUAGE (MANDATORY) ━━━
Detect the language of the FIRST user message in the conversation and respond in THAT language for the entire conversation. Never switch languages mid-conversation, even if intermediate messages are shorter or use technical English terms. French question → French answer. English question → English answer. This rule overrides every other formatting preference.

━━━ INFORMATION SOURCES (STRICT) ━━━
- **MOLYDAL PRODUCTS**: ONLY the technical datasheets provided in the context below. Never invent anything, never rely on general knowledge. If a Molydal product is not in the context, it does not exist for you.
- **COMPETITOR PRODUCTS**: if you need to identify a competitor product or obtain its characteristics (viscosity, additives, certifications, application), use the \`web_search\` tool. **Never guess**, NEVER rely on your general knowledge. If the web search returns nothing usable, say so explicitly.
- **ABSOLUTE RULE**: zero hallucination. Any information about a competitor lubricant must come from a verified web search; any information about a Molydal product must come from the RAG context.
- **ONLY USE WEB SEARCH FOR**: identifying/documenting a competitor product. Never for answering other questions (lubricant generalities, Molydal, professional advice) — answer using the RAG context alone.

━━━ HANDLING UNKNOWN COMPETITOR PRODUCTS ━━━
When the web search returns nothing usable for the competitor product, DO NOT refuse to help. Instead:
1. State explicitly which sources you tried and that you could not verify the competitor's exact specifications.
2. Propose the most plausible Molydal candidate(s) FROM THE RAG CONTEXT, based on the product name (clues from the brand, model number, naming conventions) and the conversation context.
3. Frame these candidates as **provisional suggestions to confirm with the user** (e.g. "the most likely match in the Molydal catalog is X — could you confirm by sharing the datasheet or specific use case?").
4. Order candidates from highest to lowest plausibility and explain the reasoning briefly.
Refusing to propose anything is the wrong default — the user needs at least a starting hypothesis.

━━━ SELECTION RULES (follow this priority order) ━━━

1. Identical APPLICATION first.
   First precisely identify the application of the competitor product:
   assembly/mounting fluid | neat cutting oil | soluble cutting fluid / micro-emulsion | MQL cutting oil | vanishing (evaporating) oil | high-speed bearing grease | multipurpose water-resistant grease (marine) | chain lubricant | food-grade white oil | hydraulic oil | metal forming oil | electrical contact cleaner | brake/parts cleaner aerosol | anti-spatter welding spray | ceramic high-temperature assembly paste | petroleum jelly / petrolatum | semi-dry lubricant with solid lubricant (PTFE, MoS₂) | etc.
   The Molydal equivalent must have the SAME application. Never cross families:
   - An assembly fluid cannot be replaced by a cutting oil, nor by a metal forming oil.
   - A neat (entire) cutting oil ≠ a food-grade white machining oil (different families).
   - A mineral white oil (USAGOL AL, H 125 AL) ≠ a hydraulic oil (HYDRO series) even if both have NSF H1 certification.
   - A food-grade vanishing oil (MYE …AL) ≠ an industrial vanishing oil (MYE without AL).
   - A welding anti-spatter spray (PROTEC NF) ≠ a release agent or general grease.
   - A petroleum jelly (VASELINE TECHNIQUE) ≠ a white mineral oil even though both are paraffinic.

   When the user provides an APPLICATION CONTEXT (welding, marine, food contact, electrical contacts, brake cleaning, assembly), that context is a HARD CONSTRAINT. Recommend nothing outside it. If no product in the context matches, say so explicitly rather than fall back to a wrong family.

2. PHYSICAL FORM / FORMAT.
   Respect the form factor: aerosol/spray | liquid in bottle | paste in tube | grease in cartridge.
   - A spray/aerosol can only be replaced by another spray/aerosol (or by a product that is explicitly available as an aerosol variant — say so).
   - A paste cannot be replaced by a liquid grease.
   - If user mentions "aerosol", "spray", "en bombe", "pulvérisable", treat format as a hard constraint.

3. Non-negotiable regulatory CERTIFICATION.
   NSF H1 / food contact / USDA → the Molydal equivalent must be NSF H1.
   A product without food-grade certification never replaces an NSF H1 product.
   Eco-responsibility / biodegradability flagged on the competitor product is also a hard constraint when present.

4. ISO VISCOSITY.
   Prefer the same ISO grade (32, 46, 68, 100, 220, 320, 460…).

5. OIL BASE.
   Respect the base (mineral white, synthetic PAO, ester, vegetable…).
   If the customer asks for a vegetable alternative, propose it as a complement.

6. THICKENER (greases only).
   Respect the family: polyurea, lithium complex, calcium sulfonate, calcium complex, calcium anhydrous, lithium-calcium, PTFE.

━━━ ABSOLUTE EXCLUSIONS ━━━
- Never recommend equipment (automatic dispenser, pump, kit) as an equivalent of a lubricant.
- If no product in the context matches the correct application, say so clearly. Do not recommend a product from an incorrect family by default.
- Never invent a Molydal reference that is absent from the context. If the user asks about a specific Molydal code, only confirm it if it appears verbatim in the context.

━━━ DO NOT OVER-CONSTRAIN ━━━
Use only the constraints the user actually mentioned. Do not invent extra requirements (ISO grade, hydraulic application, NSF H1, etc.) that the competitor product's profile does not impose — adding constraints that aren't there leads to wrongly rejecting valid Molydal equivalents.

━━━ RESPONSE FORMAT ━━━
1. Identify the exact application and key characteristics of the competitor product (2-3 lines).
2. Present THE best Molydal equivalent from the context first, with technical justification.
3. Mention 1-2 relevant alternatives from the context if they bring different value.
4. Do not list every product — precision comes first.

The relevance score (%) is a raw vector similarity, not business relevance — ignore it.
You are precise, concise, and professional. You cite exact technical values.`;

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
              `${m.role === 'user' ? 'Customer' : 'Assistant'}: ${m.text}`,
          )
          .join('\n')
      : '';

    const prompt = contextStr
      ? `Conversation context:\n${contextStr}\n\nNew customer question: ${question}`
      : `Customer question: ${question}`;

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
      `You are an expert in industrial lubricants. Translate the competitor product name into a technical search query to find its Molydal equivalent.

EXPECTED OUTPUT: only the search terms, no explanation, no trailing punctuation, in English.

Rules for the search query:
- Lead with the APPLICATION family (cutting oil, grease, paste, cleaner, spray) — this drives retrieval.
- Add the PHYSICAL FORM only when it is a defining feature (aerosol, spray, paste, cartridge).
- Include APPLICATION CONTEXT when relevant (welding, marine, food contact, electrical contacts, brake parts).
- Do not invent specifications (no fake ISO grade, no fake NSF H1, no fake viscosity).

Examples:
- "Klüber ISOFLEX NBU 15" → polyurea grease high speed bearings synthetic low viscosity
- "Fuchs RENOFORM DSW 1002" → synthetic aqueous fluid cold forming deep drawing ready to use
- "Cimcool P80" → assembly mounting fluid aqueous hoses rubber seals
- "Bonderite L-FM L67" → vanishing oil NSF H1 food grade light stamping cutting
- "Klüber Paraliq P 68" → white mineral oil NSF H1 ISO 68 food contact
- "TotalEnergies Ceran XM 460" → calcium sulfonate grease extreme pressure high temperature ISO 460
- "Klüberfluid NH1 CM 4-100" → semi-dry lubricant PTFE solid lubricant synthetic PAO food grade NSF H1 spray aerosol
- "Klüberfood NH1 94-402" → grease bearings food grade NSF H1 PAO calcium complex thickener
- "INTERFLON Eco Degreaser" → eco-responsible degreaser food grade aerosol cleaner biodegradable
- "Bardahl Nettoyant Freins" → brake parts cleaner aerosol fast-evaporating chlorine-free dielectric solvent
- "WD-40 Specialist Grease Spray" → grease aerosol spray lithium mineral long-lasting adhesive
- "CRC Contact Cleaner" → electrical contact cleaner aerosol plastic-safe fast-drying hydrocarbon solvent
- "Loctite Aerodag Ceramishield" → welding anti-spatter ceramic dry film protective spray MIG MAG
- "Molykote BR-2 Plus" → grease mineral lithium molybdenum disulfide MoS2 extreme pressure NLGI 2
- "Jelt Huile de Coupe Entière" → neat cutting oil entire mineral metalworking machining non-soluble
- "Interflon Paste HT1200" → ceramic high temperature assembly paste anti-seize metal-free NSF H1
- "Igol Usinov 2675 BF" → soluble cutting fluid micro-emulsion semi-synthetic boron-free machining biostable
- "Igol SHP 50 C" → multipurpose grease lithium calcium water-resistant marine adhesive
- "Elkalub LA-8P" → chain lubricant adhesive ester high viscosity print press
- "Bérulube PV DAB 10" → petroleum jelly petrolatum technical pharmaceutical white grade

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
      input.retrievalFilters,
    );

    const context =
      chunks.length > 0
        ? chunks
            .map(
              (c) =>
                `[${c.product_name}] (relevance: ${(c.similarity * 100).toFixed(0)}%)\n${c.chunk_text}`,
            )
            .join('\n\n---\n\n')
        : 'No relevant technical datasheet found.';

    const sources = [...new Set(chunks.map((c) => c.product_name))];

    // Include the reformulated description so the LLM uses a pre-validated product
    // characterization rather than potentially incorrect pretrained knowledge.
    const productDescription =
      reformulated !== input.question
        ? `Identified competitor product application: ${reformulated}\n\n`
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
      system: `${SYSTEM_PROMPT}\n\n${productDescription}Context — Molydal technical datasheets:\n${context}`,
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
   *
   * `retrievalFilters` allow the caller (typically the scan flow with structured
   * identification) to enforce hard catalog filters on format / certification /
   * family BEFORE the LLM sees the candidate set.
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
    attachment?: AttachmentEntry,
    retrievalFilters?: RetrievalFilters,
  ): Promise<{
    stream: ReturnType<Anthropic['messages']['stream']>;
    sources: string[];
  }> {
    // When the conversation is attached to a scan, bias retrieval toward the
    // identified Molydal product by enriching the search query with its name.
    const contextualQuestion = productContext?.molydalName
      ? `${question} — about ${productContext.molydalName} (equivalent of ${productContext.scannedBrand ?? ''} ${productContext.scannedName ?? ''})`
      : question;

    const reformulated = await this.reformulateQuery(
      contextualQuestion,
      conversationHistory,
    );

    const chunks = await this.vectorStore.dualSearch(
      contextualQuestion,
      reformulated,
      retrievalFilters,
    );

    const context =
      chunks.length > 0
        ? chunks
            .map(
              (c) =>
                `[${c.product_name}] (relevance: ${(c.similarity * 100).toFixed(0)}%)\n${c.chunk_text}`,
            )
            .join('\n\n---\n\n')
        : 'No relevant technical datasheet found.';

    const sources = [...new Set(chunks.map((c) => c.product_name))];

    const productBlock = productContext?.scannedName
      ? `━━━ SCAN CONTEXT ━━━
Scanned competitor product: ${productContext.scannedBrand ?? '?'} ${productContext.scannedName}
Identified Molydal equivalent: ${productContext.molydalName ?? 'undetermined'}${productContext.molydalReference ? ` (ref. ${productContext.molydalReference})` : ''}

The user is asking you specifically about this match. Stay focused on these two products in your responses.

`
      : '';

    const reformulationBlock =
      !productContext && reformulated !== question
        ? `Identified competitor product application: ${reformulated}\n\n`
        : '';

    const validHistory = conversationHistory.filter((m) => m.text.trim());

    const lastUserContent: Anthropic.ContentBlockParam[] = attachment
      ? [
          {
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: attachment.base64,
            },
            title: attachment.filename,
          } satisfies Anthropic.DocumentBlockParam,
          { type: 'text', text: question },
        ]
      : [{ type: 'text', text: question }];

    const messages: Anthropic.MessageParam[] = [
      ...validHistory.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.text,
      })),
      { role: 'user' as const, content: lastUserContent },
    ];

    const stream = this.anthropic.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      temperature: 0.3,
      system: `${SYSTEM_PROMPT}\n\n${productBlock}${reformulationBlock}Context — Molydal technical datasheets:\n${context}`,
      messages,
      tools: [WEB_SEARCH_TOOL],
    });

    return { stream, sources };
  }
}
