ALTER TABLE "voice_notes"
  ADD COLUMN "meetingEndAt" TIMESTAMP(3),
  ADD COLUMN "crmActionCode" TEXT,
  ADD COLUMN "crmActionLabel" TEXT,
  ADD COLUMN "crmObjectiveCode" TEXT,
  ADD COLUMN "crmObjectiveLabel" TEXT;
