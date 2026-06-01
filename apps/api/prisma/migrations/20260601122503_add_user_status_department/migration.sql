-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('pending', 'approved', 'rejected');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "department" TEXT,
ADD COLUMN     "status" "UserStatus" NOT NULL DEFAULT 'pending';

-- Backfill: tous les comptes existants précèdent la validation par admin,
-- ils sont considérés comme déjà approuvés pour ne pas les verrouiller.
UPDATE "users" SET "status" = 'approved';
