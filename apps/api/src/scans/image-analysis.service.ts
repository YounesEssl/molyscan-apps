import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { PrismaService } from '../prisma/prisma.service';
import { RagService } from '../chat/rag/rag.service';
import { VectorStoreService, RetrievalFilters } from '../chat/rag/vector-store.service';
import { StorageService } from '../storage/storage.service';
import { loadPimAvailability } from '../pim/pim-availability';
import {
  normalizeProductText as normalize,
  equivalenceKey,
} from '../common/utils/normalize';

// Structured taxonomy aligned with Molydal catalog families. Used to build a
// targeted RAG search query and (later) to drive metadata filters.
export type ProductCategory =
  | 'grease'
  | 'cutting_oil_neat'
  | 'cutting_fluid_soluble'
  | 'hydraulic_oil'
  | 'degreaser_cleaner'
  | 'contact_cleaner_electrical'
  | 'brake_parts_cleaner'
  | 'anti_spatter_welding'
  | 'assembly_paste'
  | 'chain_lubricant'
  | 'vanishing_oil'
  | 'mold_release_paste'
  | 'petroleum_jelly'
  | 'leak_detector'
  | 'general_lubricant_spray'
  | 'other';

export type ProductFormat =
  | 'aerosol'
  | 'spray_pump'
  | 'liquid_bottle'
  | 'liquid_drum'
  | 'paste_tube'
  | 'cartridge'
  | 'bulk_drum'
  | 'unknown';

export interface IdentifiedProduct {
  name: string;
  brand: string;
  /** Legacy free-text type (kept for backward compatibility) */
  type: string;
  /** Legacy free-text specs (kept for backward compatibility) */
  specs: string;
  /** Structured high-level category */
  category?: ProductCategory;
  /** Physical form factor (aerosol/spray/paste/etc) */
  format?: ProductFormat;
  /** Application contexts mentioned on packaging (welding, food_contact, marine, electrical, brake, …) */
  applicationContext?: string[];
  /** Certifications visible on packaging (NSF_H1, USDA, eco_responsible, …) */
  certifications?: string[];
  /** Thickener family for greases (lithium, calcium_complex, polyurea, PTFE, MoS2, …) */
  thickener?: string;
  /** ISO viscosity if visible (32, 46, 68, 100, …) */
  isoViscosity?: number;
}

export interface ImageAnalysisResult {
  /** Scan ID (persisted in DB) */
  id: string;
  /** Identified competitor product */
  identified: IdentifiedProduct;
  /** Best Molydal equivalent(s) */
  equivalents: Array<{
    name: string;
    family: string;
    compatibility: number;
    reason: string;
  }>;
  /** Full analysis text from the LLM */
  analysis: string;
  /** Source product names from RAG */
  sources: string[];
}

@Injectable()
export class ImageAnalysisService {
  private readonly logger = new Logger(ImageAnalysisService.name);
  private readonly gemini: GoogleGenerativeAI;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private ragService: RagService,
    private vectorStore: VectorStoreService,
    private storage: StorageService,
  ) {
    this.gemini = new GoogleGenerativeAI(
      this.configService.getOrThrow<string>('GEMINI_API_KEY'),
    );
  }

  async analyzeImage(
    imageBase64: string,
    mimeType: string,
    userId: string,
    userMessage?: string,
    location?: { lat?: number; lng?: number; label?: string },
    clientRequestId?: string,
    language = 'fr',
  ): Promise<ImageAnalysisResult> {
    const t0 = Date.now();

    // Idempotency: a replayed offline sync returns the existing scan instead of
    // re-running the (costly) Gemini + RAG + selection pipeline.
    if (clientRequestId) {
      const existing = await this.prisma.scan.findUnique({ where: { clientRequestId } });
      if (existing) {
        if (existing.userId !== userId) throw new ConflictException('Scan request already exists');
        this.logger.log(`♻️ Idempotent hit — scan ${existing.id} déjà créé pour clientRequestId`);
        return this.scanToResult(existing);
      }
    }

    this.logger.log(`🔍 Analyse démarrée (image ${(imageBase64.length * 0.75 / 1024).toFixed(0)} Ko)`);

    // Upload photo to MinIO in parallel with Gemini identification.
    // We tolerate upload failures — the scan still completes, just without a stored photo.
    const photoUploadPromise = this.uploadScanPhoto(imageBase64, mimeType, userId);

    // Step 1: Gemini vision — identify the product from the image
    const identification = await this.identifyProduct(imageBase64, mimeType, userMessage);
    this.logger.log(`✅ Step 1 — Identification (Gemini): ${Date.now() - t0}ms → ${identification.name || 'aucun produit'}`);

    // No product found — persist as no_match and return early
    if (!identification.name || identification.name === 'null' || identification.name === null) {
      this.logger.log(`⚠️ Aucun produit détecté, total: ${Date.now() - t0}ms`);
      const photoKey = await photoUploadPromise;
      const scan = await this.prisma.scan.create({
        data: {
          clientRequestId,
          status: 'no_match' as any,
          scanMethod: 'image' as any,
          userId,
          locationLat: location?.lat,
          locationLng: location?.lng,
          locationLabel: location?.label,
          photoKey,
        },
      });
      return {
        id: scan.id,
        identified: identification,
        equivalents: [],
        analysis: language === 'en'
          ? 'No lubricant product was identified in this image. Try photographing the label or packaging more closely.'
          : 'Aucun produit lubrifiant n’a été identifié. Essayez de photographier l’étiquette ou l’emballage de plus près.',
        sources: [],
      };
    }

    // Only expert decisions are reusable. Historical model outputs can contain
    // reported errors, obsolete catalog entries or another user's language and
    // constraints; replaying them would make those errors persist indefinitely.
    // EXPERT EQUIVALENCE — authoritative mapping curated by Molydal experts in
    // the admin platform. Keyed on the normalized brand+name (Vision reliably
    // reads those). When present it short-circuits the RAG guess with the
    // expert's confirmed answer — deterministic, no LLM, no retrieval drift.
    const expertEquiv = await this.prisma.expertEquivalence.findUnique({
      where: { competitorKey: equivalenceKey(identification.brand, identification.name) },
    });
    const unavailableExpert = expertEquiv && !expertEquiv.noEquivalent
      && (await loadPimAvailability(this.prisma)).isInactive(expertEquiv.molydalEquivalent);
    if (expertEquiv && !unavailableExpert) {
      this.logger.log(
        `🎯 Équivalence experte: "${identification.name}" → ${expertEquiv.molydalEquivalent} (confiance ${expertEquiv.confidence}%)`,
      );
      const equivalents = expertEquiv.noEquivalent ? [] : [
        {
          name: expertEquiv.molydalEquivalent,
          family: expertEquiv.molydalFamily || '',
          compatibility: expertEquiv.confidence,
          reason:
            expertEquiv.note ||
            (language === 'en' ? 'Equivalent validated by a Molydal expert.' : 'Équivalence validée par un expert Molydal.'),
        },
      ];
      const analysis = expertEquiv.noEquivalent
        ? (language === 'en'
          ? 'Molydal experts have confirmed that there is no equivalent for this product.'
          : 'Les experts Molydal ont confirmé qu’il n’y a pas d’équivalent pour ce produit.') + (expertEquiv.note ? ` ${expertEquiv.note}` : '')
        : `${language === 'en' ? 'Equivalent validated by a Molydal expert' : 'Équivalent validé par un expert Molydal'}${
        expertEquiv.note ? ` : ${expertEquiv.note}` : '.'
      }`;
      const photoKey = await photoUploadPromise;
      const scan = await this.prisma.scan.create({
        data: {
          clientRequestId,
          status: expertEquiv.noEquivalent ? 'no_match' : (expertEquiv.confidence >= 70 ? 'matched' : 'partial'),
          scanMethod: 'image' as any,
          userId,
          locationLat: location?.lat,
          locationLng: location?.lng,
          locationLabel: location?.label,
          identifiedName: identification.name,
          identifiedBrand: identification.brand,
          identifiedType: identification.type,
          identifiedSpecs: identification.specs,
          molydalEquivalent: expertEquiv.noEquivalent ? null : expertEquiv.molydalEquivalent,
          equivalentFamily: expertEquiv.noEquivalent ? null : expertEquiv.molydalFamily,
          compatibility: expertEquiv.noEquivalent ? null : expertEquiv.confidence,
          analysisText: analysis,
          equivalentsJson: equivalents as any,
          photoKey,
        },
      });
      this.logger.log(`🏁 Analyse (équivalence experte) terminée en ${Date.now() - t0}ms`);
      return {
        id: scan.id,
        identified: identification,
        equivalents,
        analysis,
        sources: [],
      };
    }

    // Step 2: RAG search — build a Molydal-oriented search query from the
    // STRUCTURED identification (category + format + application + certif + thickener).
    // The structured query lands the embedding in the right cluster; the Gemini
    // reformulation in parallel adds synonyms / variations.
    const t2 = Date.now();
    const searchQuery = this.buildSearchQuery(identification);
    this.logger.log(`   Search query: "${searchQuery.slice(0, 160)}${searchQuery.length > 160 ? '…' : ''}"`);
    const reformulationInput = `Find the Molydal equivalent of ${identification.name} by ${identification.brand}.${
      identification.category ? ` Category: ${identification.category}.` : ''
    }${identification.format && identification.format !== 'unknown' ? ` Format: ${identification.format}.` : ''}${
      identification.applicationContext?.length ? ` Application: ${identification.applicationContext.join(', ')}.` : ''
    }${
      identification.certifications?.length ? ` Certifications: ${identification.certifications.join(', ')}.` : ''
    }${
      identification.thickener ? ` Thickener/chemistry: ${identification.thickener.replace(/_/g, ' ')}.` : ''
    }${
      typeof identification.isoViscosity === 'number' ? ` ISO viscosity: ${identification.isoViscosity}.` : ''
    } Characteristics: ${identification.specs}`;
    const reformulated = await this.ragService.reformulateQuery(reformulationInput, []);
    this.logger.log(`✅ Step 2a — Reformulation (Gemini): ${Date.now() - t2}ms`);

    const t2b = Date.now();
    const retrievalFilters = this.buildRetrievalFilters(identification);
    if (Object.keys(retrievalFilters).length > 0) {
      this.logger.log(`   Filters: ${JSON.stringify(retrievalFilters)}`);
    }
    const allChunks = await this.vectorStore.dualSearch(
      searchQuery,
      reformulated,
      Object.keys(retrievalFilters).length > 0 ? retrievalFilters : undefined,
    );
    // Keep the top 15 chunks: enough to surface the right spec-specific product
    // (e.g. a calcium-sulfonate grease that ranks ~13th behind generic calcium
    // greases) without flooding the model's context. Was 8 — raised after prod
    // feedback showed correct equivalents getting cut just below the threshold.
    const chunks = allChunks.slice(0, 15);
    this.logger.log(`✅ Step 2b — RAG search (Supabase): ${Date.now() - t2b}ms → ${allChunks.length} chunks, kept ${chunks.length}`);

    const context = chunks.length > 0
      ? chunks
          .map((c) => `[${c.product_name}] (relevance: ${(c.similarity * 100).toFixed(0)}%)\n${c.chunk_text}`)
          .join('\n\n---\n\n')
      : 'No relevant technical datasheet found.';

    const sources = [...new Set(chunks.map((c) => c.product_name))];
    this.logger.log(`   Sources: ${sources.join(', ')}`);

    // Step 3: Gemini — generate equivalence analysis with compatibility scores
    const t3 = Date.now();
    const analysis = await this.generateEquivalenceAnalysis(
      identification,
      context,
      sources,
      userMessage,
      language,
    );
    this.logger.log(`✅ Step 3 — Analyse équivalence (Gemini): ${Date.now() - t3}ms → ${analysis.equivalents.length} équivalent(s)`);

    // Step 4: Persist scan to database
    const bestEquiv = analysis.equivalents[0];
    const status = bestEquiv
      ? bestEquiv.compatibility >= 70 ? 'matched' : 'partial'
      : 'no_match';

    const photoKey = await photoUploadPromise;
    const scan = await this.prisma.scan.create({
      data: {
        clientRequestId,
        status: status as any,
        scanMethod: 'image' as any,
        userId,
        locationLat: location?.lat,
        locationLng: location?.lng,
        locationLabel: location?.label,
        identifiedName: identification.name,
        identifiedBrand: identification.brand,
        identifiedType: identification.type,
        identifiedSpecs: identification.specs,
        molydalEquivalent: bestEquiv?.name || null,
        equivalentFamily: bestEquiv?.family || null,
        compatibility: bestEquiv?.compatibility || null,
        analysisText: analysis.analysis,
        equivalentsJson: analysis.equivalents as any,
        photoKey,
      },
    });

    this.logger.log(`🏁 Analyse terminée en ${Date.now() - t0}ms — ${identification.name} → ${bestEquiv?.name || 'aucun'} (${bestEquiv?.compatibility || 0}%)`);
    return { ...analysis, id: scan.id };
  }

  /** Map a persisted scan row back into the analysis result shape (idempotency replay). */
  private scanToResult(scan: {
    id: string;
    identifiedName: string | null;
    identifiedBrand: string | null;
    identifiedType: string | null;
    identifiedSpecs: string | null;
    analysisText: string | null;
    equivalentsJson: unknown;
  }): ImageAnalysisResult {
    const equivalents = Array.isArray(scan.equivalentsJson)
      ? (scan.equivalentsJson as ImageAnalysisResult['equivalents'])
      : [];
    return {
      id: scan.id,
      identified: {
        name: scan.identifiedName ?? '',
        brand: scan.identifiedBrand ?? '',
        type: scan.identifiedType ?? '',
        specs: scan.identifiedSpecs ?? '',
      },
      equivalents,
      analysis: scan.analysisText ?? '',
      sources: [],
    };
  }

  private async uploadScanPhoto(
    imageBase64: string,
    mimeType: string,
    userId: string,
  ): Promise<string | null> {
    try {
      const buffer = Buffer.from(imageBase64, 'base64');
      const ext = mimeType.includes('png') ? 'png'
        : mimeType.includes('webp') ? 'webp'
        : mimeType.includes('gif') ? 'gif'
        : 'jpg';
      const key = `scans/${userId}/${Date.now()}.${ext}`;
      await this.storage.upload(key, buffer, mimeType || 'image/jpeg');
      return key;
    } catch (error) {
      this.logger.warn(`Photo upload failed: ${error}`);
      return null;
    }
  }

  private async identifyProduct(
    imageBase64: string,
    mimeType: string,
    userMessage?: string,
  ): Promise<IdentifiedProduct> {
    // Detect actual mime from magic bytes
    if (imageBase64.startsWith('iVBOR')) mimeType = 'image/png';
    else if (imageBase64.startsWith('/9j/')) mimeType = 'image/jpeg';
    else if (imageBase64.startsWith('R0lG')) mimeType = 'image/gif';
    else if (imageBase64.startsWith('UklG')) mimeType = 'image/webp';

    const prompt = `Identify the lubricant / grease / oil / cleaner / paste industrial product in this image.

If you see one, return a STRUCTURED JSON with these fields:
{
  "name": "full product name as printed on the label",
  "brand": "brand (Shell, Mobil, Klüber, Total, SKF, Fuchs, WD-40, CRC, Bardahl, Loctite, Molykote, INTERFLON, Bérulube, Igol, Jelt, …)",
  "type": "short free-text type for legacy display (e.g. \\"grease aerosol\\")",
  "specs": "free-text visible technical characteristics (viscosity, NLGI, temperature range, base oil, thickener, certifications, …)",
  "category": "ONE of: grease | cutting_oil_neat | cutting_fluid_soluble | hydraulic_oil | degreaser_cleaner | contact_cleaner_electrical | brake_parts_cleaner | anti_spatter_welding | assembly_paste | chain_lubricant | vanishing_oil | mold_release_paste | petroleum_jelly | leak_detector | general_lubricant_spray | other",
  "format": "ONE of: aerosol | spray_pump | liquid_bottle | liquid_drum | paste_tube | cartridge | bulk_drum | unknown",
  "applicationContext": ["welding" | "food_contact" | "marine" | "electrical" | "brake" | "chain" | "bearings" | "high_speed" | "high_temperature" | "automotive" | "pharmaceutical" | …],
  "certifications": ["NSF_H1" | "NSF_A1" | "USDA" | "eco_responsible" | "biodegradable" | "halal" | "kosher" | …],
  "thickener": "lithium | lithium_complex | calcium | calcium_complex | calcium_sulfonate | calcium_anhydrous | polyurea | PTFE | MoS2 | bentonite | aluminum_complex | null",
  "isoViscosity": null | 32 | 46 | 68 | 100 | 150 | 220 | 320 | 460 | 680
}

METHOD — read the label carefully, then reason about the product's FUNCTION before classifying:
1. Read every visible text: product name, brand, and especially the stated USE / purpose / "designed for…" line. Read French and English.
2. The category is driven by what the product DOES (its function), NOT by its physical form. A spray can is NOT automatically a lubricant — a degreaser, a cleaner, a leak detector and a silicone lubricant all come in aerosol cans.
3. Only fall back to "general_lubricant_spray" / "other" when the stated function is genuinely a generic multi-purpose lubricant or truly unclear. Prefer a specific category whenever the label states a specific purpose.

CATEGORY DISAMBIGUATION (these are the common mistakes — apply strictly):
- degreaser_cleaner: anything whose stated job is to CLEAN / DEGREASE / remove oil, grease, residues ("dégraissant", "cleaner", "nettoyant", "solvent cleaner", "DF" = dégraissant). A cleaning product is NEVER a lubricant, even in a spray can.
- leak_detector: stated job is to DETECT LEAKS / "détecteur de fuite" / "leak detector" / "gas leak" / forms bubbles on pressurized circuits. This is NOT a cleaner and NOT a lubricant.
- petroleum_jelly: white vaseline / "vaseline blanche" / petrolatum / "paraffinic white grease" / "white technical jelly". Classify as petroleum_jelly, NOT grease, even if the word "grease/graisse" appears.
- cutting_oil_neat vs cutting_fluid_soluble: NEAT = pure oil used UNDILUTED on the tool/metal. SOLUBLE = mixes with WATER to form an emulsion/milk ("soluble", "émulsion", "miscible eau", "water-mixable"). When the label does not clearly say water-mixable, do not assume soluble.
- chain_lubricant: ONLY when the label explicitly targets chains/conveyors. Do not use it for generic penetrating/maintenance sprays.
- brake_parts_cleaner vs degreaser_cleaner: brake_parts_cleaner only when the label specifically mentions brakes; otherwise degreaser_cleaner.
- contact_cleaner_electrical: stated for electrical/electronic contacts, relays, circuits.

OTHER FIELDS:
- format=aerosol when you see a metal can with a propellant valve. Even if "spray" is in the name, distinguish aerosol (compressed gas can) from spray_pump (trigger spray).
- applicationContext = exact contexts shown on the label (e.g. "welding spray" → ["welding"], "for brake cleaning" → ["brake"], "food grade" → ["food_contact"], "silicone" → ["silicone"]).
- certifications = ONLY what is visibly printed (NSF logo, USDA, eco label). Read the exact category: NSF H1 for lubricants and NSF A1 for cleaners are different. A generic NSF or USDA logo without its category does not prove H1. Do not infer.
- For non-grease products, set thickener to null.
- Be conservative on specs/certifications: if a field is not visible/inferable from the image, set it to null (or empty array). But ALWAYS pick the most specific category the stated function supports.

CATEGORY EXAMPLES (label → category):
- "SOBEL DF — dégraissant industriel aérosol" → degreaser_cleaner (cleaning job, not a lubricant)
- "Loctite SF 7100 Leak Detector / détecteur de fuite" → leak_detector
- "Graisse de vaseline blanche / Paraffinic white grease" → petroleum_jelly
- "Huile de coupe entière C5" → cutting_oil_neat ; "Huile soluble / émulsion de coupe" → cutting_fluid_soluble
- "Nettoyant freins / brake cleaner" → brake_parts_cleaner
- "Silicone lubricant spray" → general_lubricant_spray with applicationContext ["silicone"]
- "WD-40 multi-usage" → general_lubricant_spray

If the image does NOT contain an identifiable lubricant product, return ALL fields as null:
{"name": null, "brand": null, "type": null, "specs": null, "category": null, "format": null, "applicationContext": null, "certifications": null, "thickener": null, "isoViscosity": null}

Return ONLY the JSON object, without markdown fences.${userMessage ? `\n\nUser context: ${userMessage}` : ''}`;

    // Vision identification is the highest-leverage step of the scan pipeline:
    // a wrong category sends the RAG query into the wrong catalog cluster.
    // Vision identification is a high-volume structured extraction task, so use
    // the stable Flash-Lite model by default. Greedy decoding (temperature 0,
    // topP 0.1, topK 1) minimizes run-to-run variability. Override via
    // VISION_MODEL for A/B experiments.
    const model = this.gemini.getGenerativeModel({
      model: process.env.VISION_MODEL ?? 'gemini-3.1-flash-lite',
      generationConfig: {
        temperature: 0,
        topP: 0.1,
        topK: 1,
      },
    });
    const response = await model.generateContent([
      { inlineData: { mimeType, data: imageBase64 } },
      prompt,
    ]);

    const text = response.response.text() ?? '{}';
    try {
      let jsonStr = text.trim();
      if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      }
      const parsed = JSON.parse(jsonStr) as Partial<IdentifiedProduct>;
      const stringField = (value: unknown) => typeof value === 'string' ? value.trim() : '';
      return {
        name: stringField(parsed.name),
        brand: stringField(parsed.brand),
        type: stringField(parsed.type),
        specs: stringField(parsed.specs),
        category: parsed.category ?? undefined,
        format: parsed.format ?? undefined,
        applicationContext: Array.isArray(parsed.applicationContext)
          ? parsed.applicationContext.filter((value) => typeof value === 'string')
          : undefined,
        certifications: Array.isArray(parsed.certifications)
          ? parsed.certifications.filter((value) => typeof value === 'string')
          : undefined,
        thickener: stringField(parsed.thickener) || undefined,
        isoViscosity:
          typeof parsed.isoViscosity === 'number' ? parsed.isoViscosity : undefined,
      };
    } catch {
      return { name: '', brand: '', type: '', specs: '' };
    }
  }

  /**
   * Translate the structured identification into hard catalog filters.
   * Only emit a filter when the field is unambiguous on the packaging.
   */
  private buildRetrievalFilters(id: IdentifiedProduct): RetrievalFilters {
    const filters: RetrievalFilters = {};
    if (id.format && id.format !== 'unknown') filters.format = id.format;
    if (id.certifications?.includes('NSF_H1')) {
      filters.alimentaire = true;
      filters.nsfCategory = 'H1';
    } else if (id.certifications?.includes('NSF_A1')) {
      filters.nsfCategory = 'A1';
    }
    if (id.certifications?.includes('eco_responsible')) {
      filters.ecoResponsable = true;
    }
    // Family filter is intentionally NOT auto-derived from `category` — the
    // mapping is not 1-to-1 (multiple categories live inside "MLS DIVERS").
    return filters;
  }

  /**
   * Build a Molydal-oriented RAG search query from the structured identification.
   * Lead with category + format so the embedding lands in the right cluster of
   * the catalog before the free-text specs add detail.
   */
  private buildSearchQuery(id: IdentifiedProduct): string {
    const categoryToKeywords: Record<ProductCategory, string> = {
      grease: 'grease lubricating bearing',
      cutting_oil_neat: 'neat cutting oil entire mineral metalworking machining non-soluble',
      cutting_fluid_soluble:
        'soluble cutting fluid micro-emulsion semi-synthetic machining biostable',
      hydraulic_oil: 'hydraulic oil ISO VG circuit reducer',
      degreaser_cleaner: 'degreaser cleaner solvent industrial',
      contact_cleaner_electrical:
        'electrical contact cleaner aerosol plastic-safe fast-drying dielectric',
      brake_parts_cleaner:
        'brake parts cleaner aerosol fast-evaporating chlorine-free solvent',
      anti_spatter_welding:
        'welding anti-spatter ceramic dry film protective spray MIG MAG',
      assembly_paste:
        'assembly paste anti-seize high temperature mounting',
      chain_lubricant: 'chain lubricant adhesive penetrating',
      vanishing_oil: 'vanishing evaporating oil stamping cutting light',
      mold_release_paste: 'mold release agent paste',
      petroleum_jelly: 'petroleum jelly petrolatum technical pharmaceutical white grade vaseline paraffinic white grease',
      leak_detector: 'leak detector spray gas leak detection bubble forming foaming pressurized circuits',
      general_lubricant_spray:
        'multi-purpose lubricant aerosol spray penetrating maintenance',
      other: '',
    };
    const parts: string[] = [];
    if (id.category) parts.push(categoryToKeywords[id.category] || id.category);
    if (id.format && id.format !== 'unknown') {
      // emphasize aerosol/spray/paste as a hard signal — repeat keyword to weight it
      parts.push(id.format.replace(/_/g, ' '));
      if (id.format === 'aerosol') parts.push('aerosol can spray');
      if (id.format === 'paste_tube') parts.push('paste tube');
    }
    if (id.applicationContext?.length) {
      parts.push(...id.applicationContext.map((a) => a.replace(/_/g, ' ')));
    }
    if (id.certifications?.length) {
      parts.push(
        ...id.certifications.map((c) =>
          c === 'NSF_H1' ? 'NSF H1 food grade' : c === 'NSF_A1' ? 'NSF A1 cleaner' : c.replace(/_/g, ' '),
        ),
      );
    }
    if (id.thickener) parts.push(`${id.thickener.replace(/_/g, ' ')} thickener`);
    if (typeof id.isoViscosity === 'number') parts.push(`ISO VG ${id.isoViscosity}`);
    if (id.specs) parts.push(id.specs);
    if (id.name) parts.push(id.name);
    if (id.brand) parts.push(id.brand);
    return parts.filter(Boolean).join(' ');
  }

  private async generateEquivalenceAnalysis(
    identified: IdentifiedProduct,
    ragContext: string,
    sources: string[],
    userMessage?: string,
    language = 'fr',
  ): Promise<Omit<ImageAnalysisResult, 'id'>> {
    const unverified = (): Omit<ImageAnalysisResult, 'id'> => ({
      identified, equivalents: [], sources,
      analysis: language === 'en'
        ? 'No equivalent could be verified from the available Molydal datasheets. Please provide the competitor datasheet or ask a Molydal expert.'
        : 'Aucun équivalent n’a pu être vérifié à partir des fiches Molydal disponibles. Fournissez la fiche du concurrent ou sollicitez un expert Molydal.',
    });
    if (sources.length === 0) return unverified();

    const productList = sources.length > 0
      ? sources.map((s) => `- ${s}`).join('\n')
      : '(no product found)';

    // Build hard constraints from the structured identification. These are
    // emphasized in the system prompt so the model does not propose a product
    // from the wrong format/application/certification family.
    const constraints: string[] = [];
    if (identified.category) constraints.push(`category=${identified.category}`);
    if (identified.format && identified.format !== 'unknown')
      constraints.push(`format=${identified.format}`);
    if (identified.applicationContext?.length)
      constraints.push(`application=${identified.applicationContext.join(',')}`);
    if (identified.certifications?.length)
      constraints.push(`certifications=${identified.certifications.join(',')}`);
    if (identified.thickener) constraints.push(`thickener=${identified.thickener}`);
    const constraintsBlock = constraints.length
      ? `\nHARD CONSTRAINTS (the equivalent MUST match these): ${constraints.join(' | ')}\n`
      : '';

    const systemPrompt = `Molydal expert. Find the equivalent of ${identified.name} (${identified.brand}, ${identified.type}, ${identified.specs}).${constraintsBlock}
Available products: ${productList}
Technical datasheets:
${ragContext}

Selection rules:
- The equivalent MUST respect the hard constraints above when present.
- Match on PRIMARY FUNCTION first — what the product DOES (cleaning, lubricating, leak detection, anti-seize, …) — then secondary specs.
- Retrieval order and similarity scores are NOT evidence of technical compatibility. Compare the actual datasheet specifications, respecting application, certification, viscosity, base oil and thickener.
- Only use exact product names from Available products. Do not invent product variants, specifications or certifications.
- If the primary application is unknown or no datasheet supports a compatible product, return an empty equivalents array and explain which information is missing. Never guess from the product name alone.
- If the competitor is an AEROSOL, the equivalent must be an aerosol. If it's a paste, equivalent must be a paste.
- If the application context says "welding", the equivalent must be a welding product (anti-spatter / protective coating).
- Never recommend a product from a different family by default.

Return ONLY a JSON without markdown:
{"equivalents":[{"name":"...","family":"...","compatibility":0-100,"reason":"1 sentence"}],"analysis":"1 comparative paragraph"}
Max 2 equivalents sorted by compatibility. Do not invent any product. Respond in ${language === 'en' ? 'English' : 'French'}.`;

    const userMsg = userMessage || 'Molydal equivalent?';

    // This is a large-prompt / small-output selection call, so extended
    // thinking is disabled to keep the JSON response complete and predictable.
    const model = this.gemini.getGenerativeModel({
      model: process.env.SCAN_SELECT_MODEL ?? 'gemini-3.1-flash-lite',
      systemInstruction: systemPrompt,
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 1500,
        responseMimeType: 'application/json',
        thinkingConfig: { thinkingBudget: 0 },
      } as any,
    });
    const r = await model.generateContent(userMsg);
    let text = '';
    try {
      text = r.response.text() ?? '{}';
    } catch {
      text = '{}';
    }
    try {
      let jsonStr = text.trim();
      if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      }
      const parsed = JSON.parse(jsonStr);
      if (!Array.isArray(parsed?.equivalents) || typeof parsed.analysis !== 'string') {
        return unverified();
      }
      const catalog = new Map(sources.map((name) => [normalize(name), name]));
      const equivalents: ImageAnalysisResult['equivalents'] = [];
      for (const eq of parsed.equivalents) {
        if (!eq || typeof eq.name !== 'string' || !catalog.has(normalize(eq.name)) ||
            typeof eq.compatibility !== 'number' || !Number.isFinite(eq.compatibility) ||
            eq.compatibility < 0 || eq.compatibility > 100 ||
            typeof eq.family !== 'string' || typeof eq.reason !== 'string') {
          this.logger.warn('Discarded ungrounded or malformed equivalence output');
          return unverified();
        }
        const name = catalog.get(normalize(eq.name))!;
        if (!equivalents.some((candidate) => candidate.name === name)) {
          equivalents.push({ name, family: eq.family, compatibility: Math.round(eq.compatibility), reason: eq.reason });
        }
      }
      equivalents.sort((a, b) => b.compatibility - a.compatibility);
      // A rejected recommendation must not survive in the free-text analysis.
      if (!equivalents.length) return unverified();
      return {
        identified,
        equivalents: equivalents.slice(0, 2).filter((eq, i) => i === 0 || eq.compatibility >= 78),
        analysis: parsed.analysis,
        sources,
      };
    } catch {
      return unverified();
    }
  }
}
