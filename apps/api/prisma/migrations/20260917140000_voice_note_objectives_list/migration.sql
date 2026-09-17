ALTER TABLE "voice_notes"
  ADD COLUMN "crmObjectiveCodes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "crmObjectiveLabels" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- Keep the previous single selection when adopting the confirmed CRM list field.
UPDATE "voice_notes"
SET "crmObjectiveCodes" = ARRAY[btrim("crmObjectiveCode")],
    "crmObjectiveLabels" = ARRAY[COALESCE(NULLIF(btrim("crmObjectiveLabel"), ''), btrim("crmObjectiveCode"))]
WHERE "crmObjectiveCode" IS NOT NULL AND btrim("crmObjectiveCode") <> '';
