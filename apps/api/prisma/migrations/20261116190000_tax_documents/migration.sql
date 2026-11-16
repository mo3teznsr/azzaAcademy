-- UAE tax invoices and credit notes, numbered without gaps, and the supplier details they carry.
ALTER TABLE "PlatformSettings" ADD COLUMN "legalName" TEXT,
ADD COLUMN "legalAddress" TEXT,
ADD COLUMN "taxRegistrationNumber" TEXT,
ADD COLUMN "invoicingFrom" TIMESTAMP(3);

CREATE TYPE "TaxDocumentKind" AS ENUM ('INVOICE', 'CREDIT_NOTE');

CREATE TABLE "TaxDocument" (
    "id" TEXT NOT NULL,
    "kind" "TaxDocumentKind" NOT NULL,
    "seq" INTEGER NOT NULL,
    "number" TEXT NOT NULL,
    "invoiceId" TEXT,
    "orderId" TEXT,
    "subscriptionPaymentId" TEXT,
    "userId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "subtotalFils" INTEGER NOT NULL,
    "discountFils" INTEGER NOT NULL DEFAULT 0,
    "vatPercent" INTEGER NOT NULL,
    "vatFils" INTEGER NOT NULL,
    "totalFils" INTEGER NOT NULL,
    "supplier" JSONB NOT NULL,
    "buyer" JSONB NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TaxDocument_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "TaxDocument_kind_seq_key" ON "TaxDocument"("kind", "seq");
CREATE UNIQUE INDEX "TaxDocument_number_key" ON "TaxDocument"("number");
CREATE INDEX "TaxDocument_userId_issuedAt_idx" ON "TaxDocument"("userId", "issuedAt");
CREATE INDEX "TaxDocument_orderId_idx" ON "TaxDocument"("orderId");
CREATE INDEX "TaxDocument_subscriptionPaymentId_idx" ON "TaxDocument"("subscriptionPaymentId");
ALTER TABLE "TaxDocument" ADD CONSTRAINT "TaxDocument_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "TaxDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TaxDocument" ADD CONSTRAINT "TaxDocument_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TaxDocument" ADD CONSTRAINT "TaxDocument_subscriptionPaymentId_fkey" FOREIGN KEY ("subscriptionPaymentId") REFERENCES "SubscriptionPayment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TaxDocument" ADD CONSTRAINT "TaxDocument_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "TaxDocumentCounter" (
    "id" TEXT NOT NULL,
    "last" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "TaxDocumentCounter_pkey" PRIMARY KEY ("id")
);
