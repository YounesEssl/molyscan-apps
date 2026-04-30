-- CreateTable
CREATE TABLE "conversation_submissions" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversation_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "conversation_submissions_createdAt_idx" ON "conversation_submissions"("createdAt");

-- CreateIndex
CREATE INDEX "conversation_submissions_conversationId_idx" ON "conversation_submissions"("conversationId");

-- CreateIndex
CREATE INDEX "scans_identifiedName_identifiedBrand_idx" ON "scans"("identifiedName", "identifiedBrand");

-- AddForeignKey
ALTER TABLE "conversation_submissions" ADD CONSTRAINT "conversation_submissions_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "ai_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_submissions" ADD CONSTRAINT "conversation_submissions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
