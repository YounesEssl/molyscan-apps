-- Liens d'approbation d'inscription envoyés au commercial du département.
CREATE TABLE "registration_approval_tokens" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "recipientUserId" TEXT,
    "isFallback" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "decision" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "registration_approval_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "registration_approval_tokens_tokenHash_key" ON "registration_approval_tokens"("tokenHash");
CREATE INDEX "registration_approval_tokens_userId_idx" ON "registration_approval_tokens"("userId");

ALTER TABLE "registration_approval_tokens" ADD CONSTRAINT "registration_approval_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "registration_approval_tokens" ADD CONSTRAINT "registration_approval_tokens_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
