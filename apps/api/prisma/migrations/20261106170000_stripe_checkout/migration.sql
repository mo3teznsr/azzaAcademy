-- Card payments move to Stripe's hosted Checkout page; the webhook confirms against the session.
ALTER TABLE "Order" ADD COLUMN "stripeCheckoutSessionId" TEXT;
CREATE UNIQUE INDEX "Order_stripeCheckoutSessionId_key" ON "Order"("stripeCheckoutSessionId");
