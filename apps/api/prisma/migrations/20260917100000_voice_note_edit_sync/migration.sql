ALTER TABLE "voice_notes"
  ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "crmSyncedRevision" INTEGER,
  ADD COLUMN "crmSyncToken" TEXT,
  ADD COLUMN "crmSyncStartedAt" TIMESTAMP(3),
  ADD COLUMN "syncErrorCode" TEXT;

-- Before this migration an ID was stored only after successful CRM creation.
UPDATE "voice_notes" SET "crmSyncedRevision" = 0
WHERE "crmCommunicationId" IS NOT NULL;

-- A historical timeout could have created a communication without returning its ID.
-- Do not silently create another one until that outcome has been reconciled.
UPDATE "voice_notes" SET "syncErrorCode" = 'legacy_uncertain'
WHERE "syncStatus" = 'failed' AND "crmCommunicationId" IS NULL;
