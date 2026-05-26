-- AlterEnum
ALTER TYPE "ScanMethod" ADD VALUE 'image';

-- AlterTable
ALTER TABLE "scans" ADD COLUMN     "analysisText" TEXT,
ADD COLUMN     "compatibility" INTEGER,
ADD COLUMN     "equivalentFamily" TEXT,
ADD COLUMN     "identifiedBrand" TEXT,
ADD COLUMN     "identifiedName" TEXT,
ADD COLUMN     "identifiedSpecs" TEXT,
ADD COLUMN     "identifiedType" TEXT,
ADD COLUMN     "molydalEquivalent" TEXT;
