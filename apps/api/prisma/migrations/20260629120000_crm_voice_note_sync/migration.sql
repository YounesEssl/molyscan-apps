-- AlterTable
ALTER TABLE "voice_notes" ADD COLUMN     "companyId" TEXT,
ADD COLUMN     "crmCommunicationId" TEXT;

-- CreateTable
CREATE TABLE "crm_credentials" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "login" TEXT NOT NULL,
    "passwordEnc" TEXT NOT NULL,
    "idToken" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crm_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "crm_credentials_userId_key" ON "crm_credentials"("userId");

-- AddForeignKey
ALTER TABLE "crm_credentials" ADD CONSTRAINT "crm_credentials_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
