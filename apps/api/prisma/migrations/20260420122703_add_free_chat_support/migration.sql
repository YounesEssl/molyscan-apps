-- DropForeignKey
ALTER TABLE "ai_conversations" DROP CONSTRAINT "ai_conversations_scanId_fkey";

-- AlterTable
ALTER TABLE "ai_conversations" ADD COLUMN     "title" TEXT NOT NULL DEFAULT 'Nouvelle conversation',
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'product',
ALTER COLUMN "scanId" DROP NOT NULL,
ALTER COLUMN "scannedName" DROP NOT NULL,
ALTER COLUMN "scannedBrand" DROP NOT NULL,
ALTER COLUMN "molydalName" DROP NOT NULL,
ALTER COLUMN "molydalReference" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "scans"("id") ON DELETE SET NULL ON UPDATE CASCADE;
