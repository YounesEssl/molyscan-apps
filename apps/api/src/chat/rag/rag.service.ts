import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ExpertEquivalence } from '@prisma/client';
import { VectorStoreService, RetrievalFilters } from './vector-store.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  equivalenceKey,
  normalizeProductText,
} from '../../common/utils/normalize';
import type { AttachmentEntry } from '../attachment.store';
import { ACTIVE_CATALOGUE_RULE, loadPimAvailability, PimAvailability } from '../../pim/pim-availability';

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
- **COMPETITOR PRODUCTS**: if you need to identify a competitor product or obtain its characteristics (viscosity, additives, certifications, application), use Google Search. **Never guess**, NEVER rely on your general knowledge. If the web search returns nothing usable, say so explicitly.
- **ABSOLUTE RULE**: zero hallucination. Any information about a competitor lubricant must come from a verified web search; any information about a Molydal product must come from the RAG context.
- **ONLY USE WEB SEARCH FOR**: identifying/documenting a competitor product. Never for answering other questions (lubricant generalities, Molydal, professional advice) — answer using the RAG context alone.

━━━ HANDLING UNKNOWN COMPETITOR PRODUCTS ━━━
When the competitor's primary application or mandatory specifications cannot be verified from the user's label/datasheet or an actual search result, state what is missing and ask for that information. Do NOT infer an equivalent from a brand/model name or from retrieval rank alone. A reformulated search query is a retrieval aid, never verified technical evidence. Do not claim to have searched a source unless the tool actually returned it.
Only propose a Molydal equivalent when the supplied datasheets support its compatibility. If none qualifies, say that no equivalent could be confirmed. An expert decision that there is no equivalent overrides older scan guesses and previous messages.

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
   - If the competitor product name OR the user's message contains "aerosol", "spray", "en bombe", "pulvérisable", "bomb", treat format as a hard constraint — even if the user does not repeat it. Extract format from the product name automatically.

3. Non-negotiable regulatory CERTIFICATION.
   For LUBRICANTS with NSF H1 / incidental food contact / USDA requirements, the Molydal equivalent must be NSF H1.
   For CLEANERS certified NSF A1, require a compatible cleaner with NSF A1. A1 is a cleaning-product registration, never proof of H1 lubrication certification; do not require H1 for an A1 cleaner.
   A product without H1 certification never replaces an NSF H1 lubricant.
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

@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);
  private readonly gemini: GoogleGenerativeAI;

  constructor(
    private configService: ConfigService,
    private vectorStore: VectorStoreService,
    // Optional so the eval test modules (which don't provide Prisma) still work;
    // present in the real app via the global PrismaModule.
    @Optional() private prisma?: PrismaService,
  ) {
    this.gemini = new GoogleGenerativeAI(
      this.configService.getOrThrow<string>('GEMINI_API_KEY'),
    );
  }

  /** Keep the last explicitly named product as the topic; never infer it from an AI answer. */
  private async resolveExpertContext(
    question: string,
    history: Array<{ role: string; text: string }>,
    scannedBrand?: string | null,
    scannedName?: string | null,
    availability = new PimAvailability([]),
  ): Promise<{ expert: ExpertEquivalence | null; useScanContext: boolean }> {
    if (!this.prisma) return { expert: null, useScanContext: true };
    // Fail closed if expert decisions cannot be read.
    const all = await this.prisma.expertEquivalence.findMany();
    const availableExpert = (expert: ExpertEquivalence | null) => {
      if (!expert || expert.noEquivalent) return expert;
      return availability.isInactive(expert.molydalEquivalent) ? null : availability.sanitizeExpertNote(expert);
    };
    const tokens = (value: string) => normalizeProductText(value)
      .replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
    const match = (text: string) => {
      const q = ` ${tokens(text)} `;
      const mentions = (value: string) => Boolean(tokens(value)) && q.includes(` ${tokens(value)} `);
      const candidates = all.filter((entry) =>
        tokens(entry.competitorName).length >= 4 && mentions(entry.competitorName),
      );
      const branded = candidates.filter((entry) => mentions(entry.competitorBrand));
      if (branded.length) return branded;
      const target = this.explicitProductTarget(text);
      if (!target || !this.hasExplicitProductReference(text)) return candidates;
      const namedTarget = tokens(target).replace(/^(?:(?:le|la|les|the|un|une|a|an) )?(?:(?:produit|product|huile|oil|graisse|grease) )?/, '');
      // "OtherBrand Product 68" must not borrow Brand's veto simply because
      // Brand is the only expert record currently carrying that product name.
      return candidates.filter((entry) =>
        ` ${tokens(target)} `.startsWith(` ${tokens(entry.competitorName)} `) ||
        ` ${namedTarget} `.startsWith(` ${tokens(entry.competitorName)} `),
      );
    };

    // Current explicit identities take precedence over the scan and older turns.
    // Stop at an explicit uncurated product too: a subsequent "closest one?"
    // must not revive the veto for an earlier, different product.
    const userTurns = [question, ...history.filter((turn) => turn.role === 'user').map((turn) => turn.text).reverse()];
    for (const text of userTurns) {
      const matches = match(text);
      if (matches.length) {
        const expert = matches.length === 1 ? matches[0] : null;
        return {
          expert: availableExpert(expert),
          useScanContext: Boolean(expert && scannedName &&
            equivalenceKey(expert.competitorBrand, expert.competitorName) === equivalenceKey(scannedBrand, scannedName)),
        };
      }
      const mentionsKnownBrand = all.some((entry) => tokens(entry.competitorBrand) &&
        ` ${tokens(text)} `.includes(` ${tokens(entry.competitorBrand)} `));
      if (mentionsKnownBrand || this.hasExplicitProductReference(text)) return { expert: null, useScanContext: false };
    }
    const expert = scannedName
      ? await this.prisma.expertEquivalence.findUnique({ where: { competitorKey: equivalenceKey(scannedBrand, scannedName) } })
      : null;
    return { expert: availableExpert(expert), useScanContext: true };
  }

  private explicitProductTarget(text: string): string | undefined {
    return normalizeProductText(text).match(/\b(?:equivalents? (?:de|du|pour|of|for|to)|alternative (?:a|au|de|to|for)|remplacer|replace|passons a|parlons (?:de|plutot de)|switch to|instead of|et pour|what about|how about|qu.en est.il de|concernant)\s+(.+)/i)?.[1];
  }

  /** Explicit switches/targets, as distinct from "this product" or "the closest one". */
  private hasExplicitProductReference(text: string): boolean {
    const q = normalizeProductText(text);
    const reference = this.explicitProductTarget(text);
    if (reference) {
      const generic = /^(?:(?:ce|cet|cette|ces|son|sa|ses|mon|ma|mes|notre|nos|leur|leurs|this|that|these|those|my|our|its)\b|(?:le|la|les|the) (?:meme|memes|same|produit|product|lubrifiant|lubricant|huile|oil|graisse|grease)\b|celui|celle|it\b|un equivalent|une alternative|(?:une?|a|an) (?:utilisation|application|usage|certification|viscosite|use)\b|(?:nsf|iso|din|nlgi|h1|h2|a1|a8|viscosite|viscosity)\b)/i;
      return !generic.test(reference);
    }
    // Alphanumeric product identifiers can establish another topic. Certification
    // and specification codes are constraints on the current product, not names.
    return /\b[a-z]+[0-9][a-z0-9]*\b/i.test(q) &&
      !/\b(?:nsf|iso|din|nlgi|h1|h2|a1|a8|viscosite|viscosity|temperature|cst)\b/.test(q);
  }

  private isEquivalenceRequest(question: string): boolean {
    return /\b(?:equivalen\w*|alternativ\w*|substitut\w*|remplac\w*|replac\w*|closest|nearest|plus proche|a la place)\b/.test(normalizeProductText(question));
  }

  private validatedEquivalenceBlock(eq: ExpertEquivalence | null): string {
    if (!eq) return '';
    if (eq.noEquivalent) {
      return `━━━ DÉCISION EXPERTE MOLYDAL : AUCUN ÉQUIVALENT ━━━
Les experts Molydal ont confirmé qu’il n’existe pas d’équivalent pour ${eq.competitorBrand} ${eq.competitorName}.${eq.note ? ` Note : ${eq.note}` : ''}
Cette décision concerne ce produit précis et reste applicable aux demandes de produit proche, de substitution ou de remplacement. Ne réintroduis aucune ancienne suggestion du scan. Tu peux répondre aux questions techniques, expliquer les précautions ou résumer une pièce jointe sans proposer un équivalent. Pour un autre produit explicitement demandé, évalue uniquement les fiches disponibles de ce produit.

`;
    }
    return `━━━ ÉQUIVALENCE VALIDÉE PAR UN EXPERT MOLYDAL ━━━
${eq.competitorBrand} ${eq.competitorName} → ${eq.molydalEquivalent}${eq.molydalFamily ? ` (${eq.molydalFamily})` : ''}.${eq.note ? ` Note: ${eq.note}.` : ''}
Cette équivalence est confirmée pour ce produit concurrent. Elle prévaut sur les anciennes suggestions du scan. Ne propose pas d'autre équivalent, sauf demande explicite. Seule l'équivalence est validée ; toute caractéristique technique doit être justifiée par les fiches fournies.

`;
  }

  private noEquivalentResponse(
    eq: ExpertEquivalence,
    question: string,
    history: Array<{ role: string; text: string }>,
  ): RagOutput {
    const firstMessage = history.find((message) => message.role === 'user')?.text || question;
    const english = /\b(the|what|which|give|show|please|find|equivalent of|for|can you)\b/i.test(firstMessage)
      && !/\b(le|la|les|quel|quelle|pour|donne|fiche|bonjour)\b/i.test(firstMessage);
    const product = `${eq.competitorBrand} ${eq.competitorName}`.trim();
    return {
      text: (english
        ? `Molydal experts have confirmed that there is no equivalent for ${product}.`
        : `Les experts Molydal ont confirmé qu’il n’y a pas d’équivalent pour ${product}.`)
        + (eq.note ? `\n\n${eq.note}` : ''),
      sources: [],
    };
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
      model: process.env.QUERY_REFORMULATION_MODEL ?? 'gemini-3.1-flash-lite',
      // Disable extended thinking for this simple reformulation task
      generationConfig: {
        maxOutputTokens: 400,
        temperature: 0,
        thinkingConfig: { thinkingBudget: 0 },
      } as any,
    });
    try {
      const response = await model.generateContent(
        `You are an expert in industrial lubricants. Translate the competitor product name into a technical search query to find its Molydal equivalent.

EXPECTED OUTPUT: only the search terms, no explanation, no trailing punctuation, in English.

Rules for the search query:
- Lead with the APPLICATION family (cutting oil, grease, paste, cleaner, spray) — this drives retrieval.
- PRESERVE every distinctive technical differentiator explicitly provided in the input — thickener / chemistry (calcium sulfonate, polyurea, lithium complex, aluminium complex, PTFE, MoS2, bentonite), base oil (mineral, PAO, ester, silicone), certifications (NSF H1 / food grade), ISO grade and NLGI. These are what separate the correct equivalent from its siblings in the SAME family — never drop them when they are given.
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
    } catch (error) {
      this.logger.warn(
        `Query reformulation failed; using the original question: ${error instanceof Error ? error.message : String(error)}`,
      );
      return question;
    }
  }

  /**
   * Non-streaming response (for product-linked conversations).
   */
  async generateResponse(input: RagInput): Promise<RagOutput> {
    const availability = await loadPimAvailability(this.prisma);
    const conversationHistory = availability.sanitizeHistory(input.conversationHistory);
    const { expert } = await this.resolveExpertContext(input.question, conversationHistory, input.productContext?.scannedBrand, input.productContext?.scannedName, availability);
    if (expert?.noEquivalent && this.isEquivalenceRequest(input.question)) {
      return this.noEquivalentResponse(expert, input.question, input.conversationHistory);
    }
    const reformulated = await this.reformulateQuery(
      input.question,
      conversationHistory,
    );

    const chunks = (await this.vectorStore.dualSearch(
      input.question,
      reformulated,
      input.retrievalFilters,
    )).filter((chunk) => !availability.isInactive(chunk.product_name));

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

    // Reformulation helps retrieval; it is not a verified competitor datasheet.
    const productDescription =
      reformulated !== input.question
        ? `Unverified retrieval search terms (not technical evidence): ${reformulated}\n\n`
        : '';

    const validatedBlock = this.validatedEquivalenceBlock(expert);

    const systemText = `${SYSTEM_PROMPT}\n\n${ACTIVE_CATALOGUE_RULE}\n\n${validatedBlock}${productDescription}Context — Molydal technical datasheets:\n${context}`;

    const contents = [
      ...conversationHistory.map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.text }],
      })),
      { role: 'user' as const, parts: [{ text: input.question }] },
    ];

    const model = this.gemini.getGenerativeModel({
      model: process.env.CHAT_MODEL ?? 'gemini-3.1-flash-lite',
      systemInstruction: systemText,
      tools: [{ googleSearch: {} }] as any,
      generationConfig: { temperature: 0.3, maxOutputTokens: 2048 } as any,
    });

    const result = await model.generateContent({ contents } as any);
    let text = '';
    try {
      text = result.response.text() ?? '';
    } catch {
      // Gemini can throw when a chunk has no text part (e.g. grounding-only).
    }
    return { text, sources };
  }

  /**
   * Streaming response for the free chat endpoint.
   * Returns an async iterable of text deltas.
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
      identifiedType?: string | null;
      identifiedSpecs?: string | null;
      equivalents?: Array<{ name: string; family: string; compatibility: number; reason: string }>;
      analysisText?: string | null;
    },
    attachment?: AttachmentEntry,
    retrievalFilters?: RetrievalFilters,
  ): Promise<{
    stream: AsyncIterable<string>;
    sources: string[];
  }> {
    const availability = await loadPimAvailability(this.prisma);
    conversationHistory = availability.sanitizeHistory(conversationHistory);
    const { expert, useScanContext } = await this.resolveExpertContext(question, conversationHistory, productContext?.scannedBrand, productContext?.scannedName, availability);
    if (!useScanContext) productContext = undefined;
    if (productContext) {
      const inactivePrimary = availability.isInactive(productContext.molydalName);
      productContext = {
        ...productContext,
        molydalName: inactivePrimary ? null : productContext.molydalName,
        molydalReference: inactivePrimary || availability.isInactiveReference(productContext.molydalReference) ? null : productContext.molydalReference,
        equivalents: productContext.equivalents?.filter((entry) => !availability.isInactive(entry.name))
          .map((entry) => ({ ...entry, reason: availability.mentionsInactive(entry.reason) ? '' : entry.reason })),
        analysisText: productContext.analysisText && availability.mentionsInactive(productContext.analysisText) ? null : productContext.analysisText,
      };
    }
    if (expert?.noEquivalent && this.isEquivalenceRequest(question)) {
      const response = this.noEquivalentResponse(expert, question, conversationHistory);
      return { sources: [], stream: (async function* () { yield response.text; })() };
    }
    // When the conversation is attached to a scan, bias retrieval toward the
    // identified Molydal product by enriching the search query with its name.
    const currentMolydalName = expert?.noEquivalent ? null : expert?.molydalEquivalent || productContext?.molydalName;
    const contextualQuestion = currentMolydalName
      ? `${question} — about ${currentMolydalName} (equivalent of ${expert?.competitorBrand ?? productContext?.scannedBrand ?? ''} ${expert?.competitorName ?? productContext?.scannedName ?? ''})`
      : question;

    const reformulated = await this.reformulateQuery(
      contextualQuestion,
      conversationHistory,
    );

    const chunks = (await this.vectorStore.dualSearch(
      contextualQuestion,
      reformulated,
      retrievalFilters,
    )).filter((chunk) => !availability.isInactive(chunk.product_name));

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
      ? (() => {
          const lines: string[] = ['━━━ SCAN CONTEXT ━━━'];
          lines.push(`Scanned competitor product: ${productContext.scannedBrand ?? '?'} ${productContext.scannedName}`);
          if (productContext.identifiedType) lines.push(`Type: ${productContext.identifiedType}`);
          if (productContext.identifiedSpecs) lines.push(`Specs: ${productContext.identifiedSpecs}`);
          lines.push('');

          if (expert?.noEquivalent) {
            lines.push('No Molydal equivalent: confirmed expert decision. Previous scan recommendations are withdrawn.');
          } else if (expert) {
            lines.push(`Expert-validated Molydal equivalent: ${expert.molydalEquivalent}`);
          } else if (productContext.equivalents && productContext.equivalents.length > 0) {
            lines.push('Proposed Molydal equivalents (ranked by compatibility):');
            for (const eq of productContext.equivalents) {
              lines.push(`  • ${eq.name} (${eq.family}) — ${eq.compatibility}% — ${eq.reason}`);
            }
          } else {
            lines.push(`Identified Molydal equivalent: ${productContext.molydalName ?? 'undetermined'}${productContext.molydalReference ? ` (ref. ${productContext.molydalReference})` : ''}`);
          }

          if (!expert && productContext.analysisText) {
            lines.push('');
            lines.push(`Initial analysis: ${productContext.analysisText}`);
          }

          lines.push('');
          lines.push('These are historical, unverified AI suggestions. Recheck them against the provided datasheets and current expert decision before endorsing an equivalent. The user is asking about this scan.');
          lines.push('');
          return lines.join('\n');
        })()
      : '';

    const reformulationBlock =
      !productContext && reformulated !== question
        ? `Unverified retrieval search terms (not technical evidence): ${reformulated}\n\n`
        : '';

    const validHistory = conversationHistory.filter((m) => m.text.trim());

    const lastUserParts = attachment
      ? [
          {
            inlineData: {
              mimeType: 'application/pdf',
              data: attachment.base64,
            },
          },
          { text: question },
        ]
      : [{ text: question }];

    const contents = [
      ...validHistory.map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.text }],
      })),
      { role: 'user' as const, parts: lastUserParts },
    ];

    const validatedBlock = this.validatedEquivalenceBlock(expert);
    const systemText = `${SYSTEM_PROMPT}\n\n${ACTIVE_CATALOGUE_RULE}\n\n${validatedBlock}${productBlock}${reformulationBlock}Context — Molydal technical datasheets:\n${context}`;

    const model = this.gemini.getGenerativeModel({
      model: process.env.CHAT_MODEL ?? 'gemini-3.1-flash-lite',
      systemInstruction: systemText,
      tools: [{ googleSearch: {} }] as any,
      generationConfig: { temperature: 0.3, maxOutputTokens: 2048 } as any,
    });

    const result = await model.generateContentStream({ contents } as any);

    const stream = (async function* () {
      for await (const chunk of result.stream) {
        try {
          const t = chunk.text();
          if (t) yield t;
        } catch {
          // A chunk with no text part (e.g. grounding metadata) throws — skip it.
        }
      }
    })();

    return { stream, sources };
  }
}
