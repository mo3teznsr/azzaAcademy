-- All-access plan: one monthly or yearly plan that opens every published recorded course.
-- Stored as a Subscription with no course; teacher shares are split by minutes watched (LessonWatchTime -> AllAccessShare).

-- AlterTable
ALTER TABLE "Subscription" ALTER COLUMN "courseId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "SubscriptionPayment" ADD COLUMN     "allAccessAccruedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "AllAccessPlan" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "monthlyPriceFils" INTEGER,
    "yearlyPriceFils" INTEGER,
    "stripeProductId" TEXT,
    "stripeMonthlyPriceId" TEXT,
    "stripeYearlyPriceId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AllAccessPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LessonWatchTime" (
    "userId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "seconds" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "LessonWatchTime_pkey" PRIMARY KEY ("userId","lessonId","day")
);

-- CreateTable
CREATE TABLE "AllAccessShare" (
    "id" TEXT NOT NULL,
    "subscriptionPaymentId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "watchedSec" INTEGER NOT NULL,
    "amountFils" INTEGER NOT NULL,
    "earningId" TEXT NOT NULL,
    "reversedFils" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AllAccessShare_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LessonWatchTime_userId_day_idx" ON "LessonWatchTime"("userId", "day");

-- CreateIndex
CREATE UNIQUE INDEX "AllAccessShare_earningId_key" ON "AllAccessShare"("earningId");

-- CreateIndex
CREATE UNIQUE INDEX "AllAccessShare_subscriptionPaymentId_courseId_key" ON "AllAccessShare"("subscriptionPaymentId", "courseId");

-- AddForeignKey
ALTER TABLE "LessonWatchTime" ADD CONSTRAINT "LessonWatchTime_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonWatchTime" ADD CONSTRAINT "LessonWatchTime_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonWatchTime" ADD CONSTRAINT "LessonWatchTime_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AllAccessShare" ADD CONSTRAINT "AllAccessShare_subscriptionPaymentId_fkey" FOREIGN KEY ("subscriptionPaymentId") REFERENCES "SubscriptionPayment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AllAccessShare" ADD CONSTRAINT "AllAccessShare_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AllAccessShare" ADD CONSTRAINT "AllAccessShare_earningId_fkey" FOREIGN KEY ("earningId") REFERENCES "Earning"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- One live all-access plan per learner (NULLs are distinct in "subscription_one_live_per_course", so it needs its own index).
CREATE UNIQUE INDEX "subscription_one_live_all_access" ON "Subscription"("userId") WHERE "courseId" IS NULL AND status IN ('INCOMPLETE', 'ACTIVE', 'PAST_DUE', 'CANCELLING');

-- Finds the paid periods still waiting for their all-access teacher shares.
CREATE INDEX "SubscriptionPayment_allAccess_pending_idx" ON "SubscriptionPayment"("periodEnd") WHERE "allAccessAccruedAt" IS NULL AND status = 'PAID';

-- The settings row, switched off until an admin sets prices.
INSERT INTO "AllAccessPlan" ("id", "enabled", "updatedAt") VALUES ('default', false, CURRENT_TIMESTAMP) ON CONFLICT ("id") DO NOTHING;
