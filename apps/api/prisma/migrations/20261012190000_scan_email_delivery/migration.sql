-- Historical scans must never trigger a retroactive commercial email.
ALTER TABLE "scans"
  ADD COLUMN "scanEmailPending" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "scanEmailPayload" JSONB,
  ADD COLUMN "scanEmailAttemptCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "scanEmailNextAttemptAt" TIMESTAMP(3),
  ADD COLUMN "scanEmailSentAt" TIMESTAMP(3);

CREATE INDEX "scans_scanEmailPending_scanEmailNextAttemptAt_idx"
  ON "scans"("scanEmailPending", "scanEmailNextAttemptAt");
