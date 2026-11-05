-- AlterEnum
ALTER TYPE "PaymentMethod" ADD VALUE 'APPLE_IAP';

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "appleAppAccountToken" TEXT,
ADD COLUMN     "appleEnvironment" TEXT,
ADD COLUMN     "appleOriginalTransactionId" TEXT,
ADD COLUMN     "appleProductId" TEXT,
ADD COLUMN     "appleTransactionId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Order_appleAppAccountToken_key" ON "Order"("appleAppAccountToken");

-- CreateIndex
CREATE UNIQUE INDEX "Order_appleTransactionId_key" ON "Order"("appleTransactionId");

