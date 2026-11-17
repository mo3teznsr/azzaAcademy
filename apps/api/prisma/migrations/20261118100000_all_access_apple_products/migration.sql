-- All-access plan on iOS: the App Store product ids of its own subscription group (monthly and yearly), set by admins
-- once the products exist in App Store Connect. Null = not sold in the iPhone app.

-- AlterTable
ALTER TABLE "AllAccessPlan" ADD COLUMN     "appleMonthlyProductId" TEXT,
ADD COLUMN     "appleYearlyProductId" TEXT;
