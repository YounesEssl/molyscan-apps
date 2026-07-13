import { randomUUID } from 'crypto';
import { Injectable, Logger, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, RagIndexStatus, RagSyncStatus, RagSyncTrigger } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EmbeddingService } from '../chat/rag/embedding.service';
import { SellbaseClient, SellbaseElement } from './sellbase.client';
import { CARAC, boolFromAny, buildChunk, detectProductType, documents, hash, latestDate, mergeData, numberValue, text } from './pim.normalizer';

@Injectable()
export class PimSyncService {
  private readonly logger = new Logger(PimSyncService.name);
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly sellbase: SellbaseClient,
    private readonly embeddings: EmbeddingService,
    private readonly config: ConfigService,
  ) {}

  async status() {
    const [activeIndex, latestRun, recentRuns, counts] = await Promise.all([
      this.prisma.ragIndexVersion.findFirst({ where: { status: RagIndexStatus.active }, orderBy: { activatedAt: 'desc' } }),
      this.prisma.ragSyncRun.findFirst({ orderBy: { createdAt: 'desc' } }),
      this.prisma.ragSyncRun.findMany({ orderBy: { createdAt: 'desc' }, take: 20 }),
      Promise.all([this.prisma.pimProduct.count({ where: { active: true } }), this.prisma.pimReference.count({ where: { active: true } })]),
    ]);
    return { activeIndex, latestRun, recentRuns, productCount: counts[0], referenceCount: counts[1], running: this.running };
  }

  async requestSync(trigger: RagSyncTrigger, requestedBy?: string) {
    if (this.running) throw new ConflictException('A PIM synchronization is already running');
    const unfinished = await this.prisma.ragSyncRun.findFirst({ where: { status: { in: [RagSyncStatus.queued, RagSyncStatus.running, RagSyncStatus.validating] } } });
    if (unfinished) throw new ConflictException('A PIM synchronization is already queued or running');
    const run = await this.prisma.ragSyncRun.create({ data: { trigger, requestedBy } });
    setImmediate(() => void this.execute(run.id));
    return run;
  }

  private async execute(runId: string) {
    this.running = true;
    let indexId: string | undefined;
    let advisoryLock = false;
    try {
      const lock = await this.prisma.$queryRaw<Array<{ locked: boolean }>>`SELECT pg_try_advisory_lock(68724193) AS locked`;
      advisoryLock = lock[0]?.locked === true;
      if (!advisoryLock) throw new Error('Another application instance owns the PIM synchronization lock');
      await this.prisma.ragSyncRun.update({ where: { id: runId }, data: { status: RagSyncStatus.running, startedAt: new Date() } });
      const [level4, level5] = await Promise.all([this.sellbase.getElements(4), this.sellbase.getElements(5)]);
      if (level4.length < 100) throw new Error(`Safety stop: Sellbase returned only ${level4.length} products`);

      const productIds = this.ids(level4, 'element_id_4');
      const referenceIds = this.ids(level5, 'element_id_5');
      const hierarchyIds = [...this.ids(level4, 'element_id_2'), ...this.ids(level4, 'element_id_3')];
      const allIds = [...new Set([...productIds, ...referenceIds, ...hierarchyIds])];
      // Sellbase's multi-element route is a non-standard GET with a JSON body
      // and is rejected by some Node/proxy combinations. The paginated route is
      // standard, deterministic and remains below the documented rate limit.
      const master = await this.sellbase.getPublishedData(allIds, 0);
      const overrides = await this.sellbase.getPublishedData(allIds, this.sellbase.publicationId);

      const existing = new Map((await this.prisma.pimProduct.findMany()).map((p) => [p.sellbaseElementId, p]));
      let changed = 0;
      const seenProducts = new Set<number>();

      for (const row of level4) {
        const elementId = Number(row.element_id_4);
        if (!elementId) continue;
        seenProducts.add(elementId);
        const data = mergeData(master[String(elementId)], overrides[String(elementId)]);
        const familyData = mergeData(master[String(Number(row.element_id_2))], overrides[String(Number(row.element_id_2))]);
        const subfamilyData = mergeData(master[String(Number(row.element_id_3))], overrides[String(Number(row.element_id_3))]);
        const name = text(data, CARAC.productName);
        if (!name) continue;
        const family = text(familyData, 10) ?? text(familyData, 15);
        const subfamily = text(subfamilyData, 13) ?? text(subfamilyData, 15);
        const payload = {
          sellbaseInstanceId: Number(row.instance_id_4) || null,
          name, family, subfamily,
          shortDescription: text(data, CARAC.shortDescription), description: text(data, CARAC.description), usage: text(data, CARAC.usage),
          baseOil: text(data, CARAC.baseOil), thickener: text(data, CARAC.thickener), nlgiGrade: text(data, CARAC.nlgi),
          viscosity40: numberValue(data, CARAC.viscosity40), baseOilViscosity40: numberValue(data, CARAC.baseOilViscosity40),
          temperatureMin: numberValue(data, CARAC.temperatureMin), temperatureMax: numberValue(data, CARAC.temperatureMax), dropPoint: numberValue(data, CARAC.dropPoint),
          dinClassification: text(data, CARAC.din), isoClassification: text(data, CARAC.iso),
          foodGrade: boolFromAny(data, [47, 1124, 1373]), ecoResponsible: boolFromAny(data, [1364, 1400]), moshMoahFree: boolFromAny(data, [1374]),
          productType: detectProductType(name, family), active: true, rawData: data as unknown as Prisma.InputJsonValue,
        };
        const sourceHash = hash(payload);
        if (existing.get(elementId)?.sourceHash !== sourceHash) changed++;
        const product = await this.prisma.pimProduct.upsert({
          where: { sellbaseElementId: elementId },
          create: { sellbaseElementId: elementId, ...payload, sourceHash, sourceUpdatedAt: latestDate(data) },
          update: { ...payload, sourceHash, sourceUpdatedAt: latestDate(data) },
        });
        await this.prisma.pimDocument.deleteMany({ where: { productId: product.id } });
        const docs = documents(data);
        if (docs.length) await this.prisma.pimDocument.createMany({ data: docs.map((d) => ({ id: randomUUID(), productId: product.id, ...d })) });
      }

      const removed = await this.prisma.pimProduct.updateMany({ where: { sellbaseElementId: { notIn: [...seenProducts] }, active: true }, data: { active: false } });
      const productBySellbase = new Map((await this.prisma.pimProduct.findMany()).map((p) => [p.sellbaseElementId, p]));
      const seenReferences = new Set<number>();
      for (const row of level5) {
        const elementId = Number(row.element_id_5);
        const parentId = Number(row.element_id_4);
        const product = productBySellbase.get(parentId);
        if (!elementId || !product) continue;
        seenReferences.add(elementId);
        const data = mergeData(master[String(elementId)], overrides[String(elementId)]);
        const payload = { code: text(data, CARAC.productCode), label: text(data, CARAC.referenceLabel), packaging: text(data, CARAC.packaging), erpStatus: text(data, CARAC.erpStatus) ?? text(data, CARAC.referenceStatus), active: true, rawData: data as unknown as Prisma.InputJsonValue };
        await this.prisma.pimReference.upsert({ where: { sellbaseElementId: elementId }, create: { sellbaseElementId: elementId, productId: product.id, ...payload, sourceHash: hash(payload), sourceUpdatedAt: latestDate(data) }, update: { productId: product.id, ...payload, sourceHash: hash(payload), sourceUpdatedAt: latestDate(data) } });
      }
      await this.prisma.pimReference.updateMany({ where: { sellbaseElementId: { notIn: [...seenReferences] }, active: true }, data: { active: false } });

      const index = await this.prisma.ragIndexVersion.create({ data: { embeddingModel: this.embeddings.model, dimensions: this.embeddings.dimensions } });
      indexId = index.id;
      await this.prisma.ragSyncRun.update({ where: { id: runId }, data: { indexId, status: RagSyncStatus.validating, productsSeen: seenProducts.size, productsChanged: changed, productsRemoved: removed.count, referencesSeen: seenReferences.size } });
      const chunkCount = await this.buildIndex(index.id);
      const validation = await this.validateIndex(index.id);
      await this.activateIndex(index.id, chunkCount, chunkCount, validation);
      await this.prisma.ragSyncRun.update({ where: { id: runId }, data: { status: RagSyncStatus.completed, finishedAt: new Date(), chunksCreated: chunkCount, details: { publicationId: this.sellbase.publicationId } } });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`PIM sync ${runId} failed: ${message}`);
      if (indexId) await this.prisma.ragIndexVersion.update({ where: { id: indexId }, data: { status: RagIndexStatus.failed, metrics: { error: message } } }).catch(() => undefined);
      await this.prisma.ragSyncRun.update({ where: { id: runId }, data: { status: RagSyncStatus.failed, finishedAt: new Date(), error: message.slice(0, 2000) } }).catch(() => undefined);
    } finally {
      if (advisoryLock) await this.prisma.$executeRaw`SELECT pg_advisory_unlock(68724193)`.catch(() => undefined);
      this.running = false;
    }
  }

  private ids(rows: SellbaseElement[], field: string): number[] {
    return [...new Set(rows.map((r) => Number(r[field])).filter(Boolean))];
  }

  private async buildIndex(indexId: string): Promise<number> {
    const products = await this.prisma.pimProduct.findMany({ where: { active: true, productType: 'lubricant' }, include: { references: { where: { active: true } } } });
    const previous = await this.prisma.ragIndexVersion.findFirst({ where: { status: RagIndexStatus.active } });
    let count = 0;
    for (const product of products) {
      const content = buildChunk(product);
      const contentHash = hash({ content, model: this.embeddings.model });
      const id = randomUUID();
      if (previous) {
        const copied = await this.prisma.$executeRawUnsafe(
          `INSERT INTO "rag_chunks" ("id","indexId","productId","content","contentHash","metadata","embedding","createdAt") SELECT $1,$2,"productId","content","contentHash","metadata","embedding",NOW() FROM "rag_chunks" WHERE "indexId"=$3 AND "productId"=$4 AND "contentHash"=$5 LIMIT 1 ON CONFLICT DO NOTHING`,
          id, indexId, previous.id, product.id, contentHash,
        );
        if (copied > 0) { count++; continue; }
      }
      const embedding = await this.embeddings.generateEmbedding(content);
      if (embedding.length !== this.embeddings.dimensions) throw new Error(`Invalid embedding dimension for ${product.name}`);
      const vector = `[${embedding.join(',')}]`;
      const packaging = [...new Set(product.references.map((r) => r.packaging).filter(Boolean))];
      const metadata = JSON.stringify({ product_name: product.name, family: product.family, food_grade: product.foodGrade, eco_responsible: product.ecoResponsible, product_type: product.productType, packaging, conditionnements: packaging });
      await this.prisma.$executeRawUnsafe(
        `INSERT INTO "rag_chunks" ("id","indexId","productId","content","contentHash","metadata","embedding","createdAt") VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7::vector,NOW())`,
        id, indexId, product.id, content, contentHash, metadata, vector,
      );
      count++;
    }
    if (count < 100) throw new Error(`Safety stop: only ${count} lubricant chunks were built`);
    return count;
  }

  private async validateIndex(indexId: string) {
    const cases = [
      { query: 'assembly mounting fluid aqueous hoses rubber seals', expected: ['LUB 19', 'LUB 13'] },
      { query: 'polyurea grease high speed bearings synthetic low viscosity', expected: ['TGV 2000'] },
      { query: 'white mineral oil NSF H1 ISO 68 food contact', expected: ['H 125 AL', 'H VG', 'USAGOL AL'] },
      { query: 'vanishing oil NSF H1 food grade light stamping cutting', expected: ['MYE 607 AL', 'MYE 615 AL'] },
      { query: 'synthetic aqueous fluid cold forming deep drawing ready to use', expected: ['SOLESTER 77', 'SOLESTER 600'] },
    ];
    const details: Array<{ query: string; passed: boolean; sources: string[] }> = [];
    for (const item of cases) {
      const embedding = await this.embeddings.generateEmbedding(item.query);
      const vector = `[${embedding.join(',')}]`;
      const rows = await this.prisma.$queryRawUnsafe<Array<{ name: string }>>(
        `SELECT p."name" FROM "rag_chunks" c JOIN "pim_products" p ON p."id"=c."productId" WHERE c."indexId"=$1 ORDER BY c."embedding" <=> $2::vector LIMIT 15`,
        indexId, vector,
      );
      const sources = rows.map((r) => r.name);
      details.push({ query: item.query, passed: item.expected.some((expected) => sources.some((source) => source.toLowerCase().includes(expected.toLowerCase()))), sources });
    }
    const passed = details.filter((d) => d.passed).length;
    // The initial PIM rollout must already outperform the broken 1/5 legacy
    // retrieval. Later deployments cannot regress below this same gate.
    if (passed < 3) throw new Error(`RAG validation failed: ${passed}/${cases.length} critical retrieval cases passed`);
    return { passed, total: cases.length, details };
  }

  private async activateIndex(indexId: string, productCount: number, chunkCount: number, validation: unknown) {
    await this.prisma.$transaction(async (tx) => {
      await tx.ragIndexVersion.updateMany({ where: { status: RagIndexStatus.active }, data: { status: RagIndexStatus.archived } });
      await tx.ragIndexVersion.update({ where: { id: indexId }, data: { status: RagIndexStatus.active, activatedAt: new Date(), productCount, chunkCount, metrics: validation as Prisma.InputJsonValue } });
    });
  }
}
