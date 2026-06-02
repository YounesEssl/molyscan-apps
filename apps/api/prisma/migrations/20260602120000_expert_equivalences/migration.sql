-- Expert-curated equivalence table consumed by the scan pipeline. Free-text,
-- keyed on the normalized competitor "brand|name". Additive — leaves the
-- existing FK-based product_equivalences (catalog) untouched.

-- CreateEnum
CREATE TYPE "EquivalenceSource" AS ENUM ('expert', 'feedback');

-- CreateTable
CREATE TABLE "expert_equivalences" (
    "id" TEXT NOT NULL,
    "competitorBrand" TEXT NOT NULL,
    "competitorName" TEXT NOT NULL,
    "competitorKey" TEXT NOT NULL,
    "molydalEquivalent" TEXT NOT NULL,
    "molydalFamily" TEXT,
    "confidence" INTEGER NOT NULL DEFAULT 100,
    "note" TEXT,
    "validatedBy" TEXT,
    "source" "EquivalenceSource" NOT NULL DEFAULT 'expert',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expert_equivalences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "expert_equivalences_competitorKey_key" ON "expert_equivalences"("competitorKey");

-- CreateIndex
CREATE INDEX "expert_equivalences_competitorBrand_idx" ON "expert_equivalences"("competitorBrand");
