-- Decouple PriceWorkflow from the MolydalProduct catalog: AI-identified
-- equivalents are free-text names, not catalog rows. The FK becomes optional
-- and the product identity is stored directly on the workflow.

ALTER TABLE "price_workflows" ALTER COLUMN "molydalProductId" DROP NOT NULL;
ALTER TABLE "price_workflows" ADD COLUMN "productName" TEXT;
ALTER TABLE "price_workflows" ADD COLUMN "molydalRef" TEXT;
