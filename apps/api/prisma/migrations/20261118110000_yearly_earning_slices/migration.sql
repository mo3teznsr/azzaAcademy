-- Yearly plans: the teacher share is accrued in 12 monthly slices (one Earning row each), so the key gains a slice index.
-- Existing rows keep slice 0, so earnings accrued before this change stay exactly as they are (one row per payment).
ALTER TABLE "Earning" ADD COLUMN "sliceIndex" INTEGER NOT NULL DEFAULT 0;

DROP INDEX "Earning_subscriptionPaymentId_kind_key";
CREATE UNIQUE INDEX "Earning_subscriptionPaymentId_kind_sliceIndex_key" ON "Earning"("subscriptionPaymentId", "kind", "sliceIndex");
