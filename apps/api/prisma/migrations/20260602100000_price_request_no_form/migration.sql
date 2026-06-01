-- Demande de prix sans formulaire : clientName et quantity deviennent optionnels.
ALTER TABLE "price_workflows" ALTER COLUMN "clientName" DROP NOT NULL,
ALTER COLUMN "quantity" DROP NOT NULL;
