CREATE TYPE "RagSyncStatus" AS ENUM ('queued', 'running', 'validating', 'completed', 'failed', 'skipped');
CREATE TYPE "RagSyncTrigger" AS ENUM ('manual', 'scheduled');
CREATE TYPE "RagIndexStatus" AS ENUM ('building', 'validating', 'active', 'archived', 'failed');

CREATE TABLE "pim_products" (
  "id" TEXT PRIMARY KEY,
  "sellbaseElementId" INTEGER NOT NULL UNIQUE,
  "sellbaseInstanceId" INTEGER,
  "name" TEXT NOT NULL,
  "family" TEXT,
  "subfamily" TEXT,
  "shortDescription" TEXT,
  "description" TEXT,
  "usage" TEXT,
  "baseOil" TEXT,
  "thickener" TEXT,
  "nlgiGrade" TEXT,
  "viscosity40" DOUBLE PRECISION,
  "baseOilViscosity40" DOUBLE PRECISION,
  "temperatureMin" DOUBLE PRECISION,
  "temperatureMax" DOUBLE PRECISION,
  "dropPoint" DOUBLE PRECISION,
  "dinClassification" TEXT,
  "isoClassification" TEXT,
  "foodGrade" BOOLEAN NOT NULL DEFAULT false,
  "ecoResponsible" BOOLEAN NOT NULL DEFAULT false,
  "moshMoahFree" BOOLEAN NOT NULL DEFAULT false,
  "productType" TEXT NOT NULL DEFAULT 'lubricant',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "sourceHash" TEXT NOT NULL,
  "sourceUpdatedAt" TIMESTAMP(3),
  "rawData" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "pim_products_active_productType_idx" ON "pim_products"("active", "productType");
CREATE INDEX "pim_products_name_idx" ON "pim_products"("name");

CREATE TABLE "pim_references" (
  "id" TEXT PRIMARY KEY,
  "sellbaseElementId" INTEGER NOT NULL UNIQUE,
  "productId" TEXT NOT NULL REFERENCES "pim_products"("id") ON DELETE CASCADE,
  "code" TEXT,
  "label" TEXT,
  "packaging" TEXT,
  "erpStatus" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "sourceHash" TEXT NOT NULL,
  "sourceUpdatedAt" TIMESTAMP(3),
  "rawData" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "pim_references_productId_idx" ON "pim_references"("productId");

CREATE TABLE "pim_documents" (
  "id" TEXT PRIMARY KEY,
  "productId" TEXT NOT NULL REFERENCES "pim_products"("id") ON DELETE CASCADE,
  "sellbaseCaracId" INTEGER NOT NULL,
  "kind" TEXT NOT NULL,
  "language" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "sourceUpdatedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("productId", "sellbaseCaracId")
);
CREATE INDEX "pim_documents_productId_kind_language_idx" ON "pim_documents"("productId", "kind", "language");

CREATE TABLE "rag_index_versions" (
  "id" TEXT PRIMARY KEY,
  "version" SERIAL NOT NULL UNIQUE,
  "status" "RagIndexStatus" NOT NULL DEFAULT 'building',
  "embeddingModel" TEXT NOT NULL,
  "dimensions" INTEGER NOT NULL,
  "productCount" INTEGER NOT NULL DEFAULT 0,
  "chunkCount" INTEGER NOT NULL DEFAULT 0,
  "metrics" JSONB,
  "activatedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "rag_index_versions_status_idx" ON "rag_index_versions"("status");

CREATE TABLE "rag_chunks" (
  "id" TEXT PRIMARY KEY,
  "indexId" TEXT NOT NULL REFERENCES "rag_index_versions"("id") ON DELETE CASCADE,
  "productId" TEXT NOT NULL REFERENCES "pim_products"("id") ON DELETE CASCADE,
  "content" TEXT NOT NULL,
  "contentHash" TEXT NOT NULL,
  "metadata" JSONB NOT NULL,
  "embedding" vector(1536) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("indexId", "productId", "contentHash")
);
CREATE INDEX "rag_chunks_indexId_productId_idx" ON "rag_chunks"("indexId", "productId");
CREATE INDEX "rag_chunks_embedding_hnsw_idx" ON "rag_chunks" USING hnsw ("embedding" vector_cosine_ops);

CREATE TABLE "rag_sync_runs" (
  "id" TEXT PRIMARY KEY,
  "status" "RagSyncStatus" NOT NULL DEFAULT 'queued',
  "trigger" "RagSyncTrigger" NOT NULL,
  "requestedBy" TEXT,
  "indexId" TEXT REFERENCES "rag_index_versions"("id") ON DELETE SET NULL,
  "startedAt" TIMESTAMP(3),
  "finishedAt" TIMESTAMP(3),
  "productsSeen" INTEGER NOT NULL DEFAULT 0,
  "productsChanged" INTEGER NOT NULL DEFAULT 0,
  "productsRemoved" INTEGER NOT NULL DEFAULT 0,
  "referencesSeen" INTEGER NOT NULL DEFAULT 0,
  "chunksCreated" INTEGER NOT NULL DEFAULT 0,
  "error" TEXT,
  "details" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "rag_sync_runs_status_createdAt_idx" ON "rag_sync_runs"("status", "createdAt");
