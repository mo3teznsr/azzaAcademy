-- Marketing spend per month and channel, for CAC, LTV/CAC and payback on the investor metrics.
CREATE TABLE "MarketingSpend" (
    "id" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "amountFils" INTEGER NOT NULL,
    "note" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MarketingSpend_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MarketingSpend_month_channel_key" ON "MarketingSpend"("month", "channel");
