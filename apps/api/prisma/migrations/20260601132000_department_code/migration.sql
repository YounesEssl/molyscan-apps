-- AlterTable
ALTER TABLE "departments" ADD COLUMN "code" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "departments_code_key" ON "departments"("code");
