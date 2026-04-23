import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { PrismaService } from '../prisma/prisma.service';
import { RagService } from '../chat/rag/rag.service';
import { VectorStoreService } from '../chat/rag/vector-store.service';

export interface ImageAnalysisResult {
  /** Scan ID (persisted in DB) */
  id: string;
  /** Identified competitor product */
  identified: {
    name: string;
    brand: string;
    type: string;
    specs: string;
  };
  /** Best Molydal equivalent(s) */
  equivalents: Array<{
    name: string;
    family: string;
    compatibility: number;
    reason: string;
  }>;
  /** Full analysis text from Claude */
  analysis: string;
  /** Source product names from RAG */
  sources: string[];
}

@Injectable()
export class ImageAnalysisService {
  private readonly logger = new Logger(ImageAnalysisService.name);
  private readonly anthropic: Anthropic;
  private readonly gemini: GoogleGenerativeAI;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private ragService: RagService,
    private vectorStore: VectorStoreService,
  ) {
    this.anthropic = new Anthropic({
      apiKey: this.configService.getOrThrow<string>('ANTHROPIC_API_KEY'),
    });
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
  ): Promise<ImageAnalysisResult> {
    const t0 = Date.now();
    this.logger.log(`🔍 Analyse démarrée (image ${(imageBase64.length * 0.75 / 1024).toFixed(0)} Ko)`);

    // Step 1: Gemini vision — identify the product from the image
    const identification = await this.identifyProduct(imageBase64, mimeType, userMessage);
    this.logger.log(`✅ Step 1 — Identification (Gemini): ${Date.now() - t0}ms → ${identification.name || 'aucun produit'}`);

    // No product found — persist as no_match and return early
    if (!identification.name || identification.name === 'null' || identification.name === null) {
      this.logger.log(`⚠️ Aucun produit détecté, total: ${Date.now() - t0}ms`);
      const scan = await this.prisma.scan.create({
        data: {
          status: 'no_match' as any,
          scanMethod: 'image' as any,
          userId,
          locationLat: location?.lat,
          locationLng: location?.lng,
          locationLabel: location?.label,
        },
      });
      return {
        id: scan.id,
        identified: identification,
        equivalents: [],
        analysis: "Aucun produit lubrifiant n'a été identifié sur cette image. Essayez de photographier l'étiquette ou l'emballage du produit de plus près.",
        sources: [],
      };
    }

    // Check cache: has this product been analyzed before?
    const cachedScan = await this.prisma.scan.findFirst({
      where: {
        identifiedName: identification.name,
        identifiedBrand: identification.brand,
        equivalentsJson: { not: null as any },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (cachedScan?.equivalentsJson) {
      this.logger.log(`⚡ Cache hit pour "${identification.name}" — réutilisation des résultats`);
      const cached = cachedScan.equivalentsJson as any[];
      const bestEquiv = cached[0];
      const status = bestEquiv
        ? bestEquiv.compatibility >= 70 ? 'matched' : 'partial'
        : 'no_match';

      const scan = await this.prisma.scan.create({
        data: {
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
          analysisText: cachedScan.analysisText,
          equivalentsJson: cachedScan.equivalentsJson as any,
        },
      });

      this.logger.log(`🏁 Analyse (cache) terminée en ${Date.now() - t0}ms`);
      return {
        id: scan.id,
        identified: identification,
        equivalents: cached,
        analysis: cachedScan.analysisText || '',
        sources: [],
      };
    }

    // Step 2: RAG search — build a Molydal-oriented search query
    const t2 = Date.now();
    const searchQuery = `graisse huile lubrifiant Molydal équivalent ${identification.type} ${identification.specs} ${identification.name}`;
    const reformulated = await this.ragService.reformulateQuery(
      `Trouve l'équivalent Molydal du ${identification.name} de ${identification.brand}. C'est un(e) ${identification.type}. Caractéristiques : ${identification.specs}`,
      [],
    );
    this.logger.log(`✅ Step 2a — Reformulation (Gemini): ${Date.now() - t2}ms`);

    const t2b = Date.now();
    const allChunks = await this.vectorStore.dualSearch(searchQuery, reformulated);
    // Keep only top 8 chunks to reduce context size and speed up Claude
    const chunks = allChunks.slice(0, 8);
    this.logger.log(`✅ Step 2b — RAG search (Supabase): ${Date.now() - t2b}ms → ${allChunks.length} chunks, kept ${chunks.length}`);

    const context = chunks.length > 0
      ? chunks
          .map((c) => `[${c.product_name}] (pertinence: ${(c.similarity * 100).toFixed(0)}%)\n${c.chunk_text}`)
          .join('\n\n---\n\n')
      : 'Aucune fiche technique pertinente trouvée.';

    const sources = [...new Set(chunks.map((c) => c.product_name))];
    this.logger.log(`   Sources: ${sources.join(', ')}`);

    // Step 3: Claude — generate equivalence analysis with compatibility scores
    const t3 = Date.now();
    const analysis = await this.generateEquivalenceAnalysis(
      identification,
      context,
      sources,
      userMessage,
    );
    this.logger.log(`✅ Step 3 — Analyse équivalence (Sonnet): ${Date.now() - t3}ms → ${analysis.equivalents.length} équivalent(s)`);

    // Step 4: Persist scan to database
    const bestEquiv = analysis.equivalents[0];
    const status = bestEquiv
      ? bestEquiv.compatibility >= 70 ? 'matched' : 'partial'
      : 'no_match';

    const scan = await this.prisma.scan.create({
      data: {
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
      },
    });

    this.logger.log(`🏁 Analyse terminée en ${Date.now() - t0}ms — ${identification.name} → ${bestEquiv?.name || 'aucun'} (${bestEquiv?.compatibility || 0}%)`);
    return { ...analysis, id: scan.id };
  }

  private async identifyProduct(
    imageBase64: string,
    mimeType: string,
    userMessage?: string,
  ): Promise<{ name: string; brand: string; type: string; specs: string }> {
    // Detect actual mime from magic bytes
    if (imageBase64.startsWith('iVBOR')) mimeType = 'image/png';
    else if (imageBase64.startsWith('/9j/')) mimeType = 'image/jpeg';
    else if (imageBase64.startsWith('R0lG')) mimeType = 'image/gif';
    else if (imageBase64.startsWith('UklG')) mimeType = 'image/webp';

    const prompt = `Identifie le produit lubrifiant/graisse/huile sur cette image.

Si tu vois un produit lubrifiant, graisse, huile ou produit de maintenance industrielle, retourne :
{
  "name": "nom complet du produit",
  "brand": "marque (Shell, Mobil, Klüber, Total, SKF, Fuchs, etc.)",
  "type": "type de produit (graisse, huile, spray, etc.)",
  "specs": "caractéristiques techniques visibles (viscosité, NLGI, température, base, épaississant, certifications, etc.)"
}

Si l'image ne contient PAS de produit lubrifiant identifiable, retourne :
{
  "name": null,
  "brand": null,
  "type": null,
  "specs": null
}

Retourne UNIQUEMENT le JSON, sans markdown.${userMessage ? `\n\nContexte de l'utilisateur : ${userMessage}` : ''}`;

    const model = this.gemini.getGenerativeModel({ model: 'gemini-2.5-flash' });
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
      return JSON.parse(jsonStr);
    } catch {
      return { name: text.slice(0, 100), brand: 'Inconnu', type: 'lubrifiant', specs: '' };
    }
  }

  private async generateEquivalenceAnalysis(
    identified: { name: string; brand: string; type: string; specs: string },
    ragContext: string,
    sources: string[],
    userMessage?: string,
  ): Promise<Omit<ImageAnalysisResult, 'id'>> {
    const productList = sources.length > 0
      ? sources.map((s) => `- ${s}`).join('\n')
      : '(aucun produit trouvé)';

    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 600,
      temperature: 0,
      system: `Expert Molydal. Trouve l'équivalent du ${identified.name} (${identified.brand}, ${identified.type}, ${identified.specs}).
Produits disponibles : ${productList}
Fiches techniques :
${ragContext}

Retourne UNIQUEMENT un JSON sans markdown :
{"equivalents":[{"name":"...","family":"...","compatibility":0-100,"reason":"1 phrase"}],"analysis":"1 paragraphe comparatif"}
Max 3 équivalents triés par compatibilité. N'invente aucun produit.`,
      messages: [{ role: 'user', content: userMessage || 'Équivalent Molydal ?' }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '{}';
    try {
      let jsonStr = text.trim();
      if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      }
      const parsed = JSON.parse(jsonStr);
      return {
        identified,
        equivalents: parsed.equivalents || [],
        analysis: parsed.analysis || '',
        sources,
      };
    } catch {
      return {
        identified,
        equivalents: [],
        analysis: text,
        sources,
      };
    }
  }
}
