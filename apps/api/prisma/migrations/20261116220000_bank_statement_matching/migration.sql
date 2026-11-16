-- Bank statement imports: credits matched to bank transfers (seat orders and plan payments) by their reference.
ALTER TABLE "BankAccount" ADD COLUMN "statementMapping" JSONB;

CREATE TABLE "BankStatementImport" (
    "id" TEXT NOT NULL,
    "bankAccountId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "importedById" TEXT,
    "creditCount" INTEGER NOT NULL,
    "newCount" INTEGER NOT NULL,
    "duplicateCount" INTEGER NOT NULL,
    "skippedCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BankStatementImport_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "BankStatementImport_bankAccountId_createdAt_idx" ON "BankStatementImport"("bankAccountId", "createdAt");
ALTER TABLE "BankStatementImport" ADD CONSTRAINT "BankStatementImport_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "BankStatementLine" (
    "id" TEXT NOT NULL,
    "importId" TEXT NOT NULL,
    "bankAccountId" TEXT NOT NULL,
    "lineHash" TEXT NOT NULL,
    "row" INTEGER NOT NULL,
    "postedOn" DATE NOT NULL,
    "amountFils" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "outcome" TEXT,
    "orderId" TEXT,
    "subscriptionPaymentId" TEXT,
    "decidedById" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BankStatementLine_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "BankStatementLine_lineHash_key" ON "BankStatementLine"("lineHash");
CREATE INDEX "BankStatementLine_importId_idx" ON "BankStatementLine"("importId");
CREATE INDEX "BankStatementLine_status_idx" ON "BankStatementLine"("status");
CREATE INDEX "BankStatementLine_orderId_idx" ON "BankStatementLine"("orderId");
CREATE INDEX "BankStatementLine_subscriptionPaymentId_idx" ON "BankStatementLine"("subscriptionPaymentId");
ALTER TABLE "BankStatementLine" ADD CONSTRAINT "BankStatementLine_importId_fkey" FOREIGN KEY ("importId") REFERENCES "BankStatementImport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BankStatementLine" ADD CONSTRAINT "BankStatementLine_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
