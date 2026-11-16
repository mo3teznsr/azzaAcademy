-- Tabby "pay in 4" for live-class seats.
ALTER TYPE "PaymentMethod" ADD VALUE 'TABBY';

-- The Tabby payment created with the checkout session (verify, capture and refund address it).
ALTER TABLE "Order" ADD COLUMN "tabbyPaymentId" TEXT;
CREATE UNIQUE INDEX "Order_tabbyPaymentId_key" ON "Order"("tabbyPaymentId");
