-- Idempotency keys for the mobile offline outbox sync.
-- Nullable columns + unique indexes: safe on existing rows (Postgres allows
-- multiple NULLs under a UNIQUE index, so no backfill is required).

ALTER TABLE "scans" ADD COLUMN "clientRequestId" TEXT;
ALTER TABLE "price_workflows" ADD COLUMN "clientRequestId" TEXT;

CREATE UNIQUE INDEX "scans_clientRequestId_key" ON "scans"("clientRequestId");
CREATE UNIQUE INDEX "price_workflows_clientRequestId_key" ON "price_workflows"("clientRequestId");
