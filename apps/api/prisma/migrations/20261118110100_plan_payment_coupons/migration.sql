-- Admin coupons on bank-transfer plans (first payment only).
-- The plan payment keeps the code and the discount; its subtotal is already net of the discount (taxable amount).
ALTER TABLE "SubscriptionPayment" ADD COLUMN "couponCode" TEXT;
ALTER TABLE "SubscriptionPayment" ADD COLUMN "discountFils" INTEGER NOT NULL DEFAULT 0;

-- A redemption belongs to a seat order or to a plan payment.
ALTER TABLE "CouponRedemption" ALTER COLUMN "orderId" DROP NOT NULL;
ALTER TABLE "CouponRedemption" ADD COLUMN "subscriptionPaymentId" TEXT;
CREATE UNIQUE INDEX "CouponRedemption_subscriptionPaymentId_key" ON "CouponRedemption"("subscriptionPaymentId");
ALTER TABLE "CouponRedemption" ADD CONSTRAINT "CouponRedemption_subscriptionPaymentId_fkey"
  FOREIGN KEY ("subscriptionPaymentId") REFERENCES "SubscriptionPayment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CouponRedemption" ADD CONSTRAINT "CouponRedemption_one_target_check"
  CHECK (("orderId" IS NOT NULL) <> ("subscriptionPaymentId" IS NOT NULL));
