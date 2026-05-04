-- CreateEnum
CREATE TYPE "EquivalentFeedbackVote" AS ENUM ('up', 'down');

-- CreateTable
CREATE TABLE "scan_equivalent_feedbacks" (
    "id" TEXT NOT NULL,
    "scanId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "equivalentName" TEXT NOT NULL,
    "vote" "EquivalentFeedbackVote" NOT NULL,
    "suggestedName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scan_equivalent_feedbacks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "scan_equivalent_feedbacks_scanId_idx" ON "scan_equivalent_feedbacks"("scanId");

-- CreateIndex
CREATE INDEX "scan_equivalent_feedbacks_createdAt_idx" ON "scan_equivalent_feedbacks"("createdAt");

-- AddForeignKey
ALTER TABLE "scan_equivalent_feedbacks" ADD CONSTRAINT "scan_equivalent_feedbacks_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "scans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scan_equivalent_feedbacks" ADD CONSTRAINT "scan_equivalent_feedbacks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
