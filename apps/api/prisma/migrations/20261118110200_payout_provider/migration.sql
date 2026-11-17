-- Teacher payouts through a provider (Stripe Connect). CSV export and "mark paid" stay the fallback.
ALTER TYPE "PayoutStatus" ADD VALUE IF NOT EXISTS 'PROCESSING';

ALTER TABLE "Payout" ADD COLUMN "provider" TEXT;
ALTER TABLE "Payout" ADD COLUMN "providerTransferId" TEXT;
ALTER TABLE "Payout" ADD COLUMN "providerStatus" TEXT;
ALTER TABLE "Payout" ADD COLUMN "providerFailureReason" TEXT;
ALTER TABLE "Payout" ADD COLUMN "providerAttempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Payout" ADD COLUMN "providerSentAt" TIMESTAMP(3);
CREATE UNIQUE INDEX "Payout_providerTransferId_key" ON "Payout"("providerTransferId");
CREATE INDEX "Payout_status_provider_idx" ON "Payout"("status", "provider");

ALTER TABLE "TeacherBankDetails" ADD COLUMN "stripeAccountId" TEXT;
