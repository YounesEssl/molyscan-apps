-- AlterTable: champs de routage sur les demandes de prix
ALTER TABLE "price_workflows" ADD COLUMN     "routedDepartmentId" TEXT,
ADD COLUMN     "routedToAdmins" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable: relation N-N implicite PriceWorkflow <-> User (destinataires de la demande)
CREATE TABLE "_WorkflowRecipients" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_WorkflowRecipients_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_WorkflowRecipients_B_index" ON "_WorkflowRecipients"("B");

-- AddForeignKey
ALTER TABLE "price_workflows" ADD CONSTRAINT "price_workflows_routedDepartmentId_fkey" FOREIGN KEY ("routedDepartmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_WorkflowRecipients" ADD CONSTRAINT "_WorkflowRecipients_A_fkey" FOREIGN KEY ("A") REFERENCES "price_workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_WorkflowRecipients" ADD CONSTRAINT "_WorkflowRecipients_B_fkey" FOREIGN KEY ("B") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
