-- Recorded courses: course type, monthly/yearly plans, subscriptions, platform cut settings,
-- video positions, and quizzes/earnings/certificates that can belong to a course instead of a batch.
-- Nothing is back-filled: every new column is nullable or has a default (existing courses become LIVE).

-- CreateEnum
CREATE TYPE "CourseType" AS ENUM ('LIVE', 'RECORDED');

-- CreateEnum
CREATE TYPE "SubscriptionPlan" AS ENUM ('MONTHLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "SubscriptionProvider" AS ENUM ('STRIPE', 'APPLE', 'BANK_TRANSFER');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('INCOMPLETE', 'ACTIVE', 'PAST_DUE', 'CANCELLING', 'EXPIRED');

-- CreateEnum
CREATE TYPE "SubscriptionPaymentStatus" AS ENUM ('AWAITING_RECEIPT', 'AWAITING_REVIEW', 'PAID', 'REJECTED', 'EXPIRED', 'REFUNDED');

-- AlterTable
ALTER TABLE "Certificate" ADD COLUMN     "courseId" TEXT,
ALTER COLUMN "batchId" DROP NOT NULL,
ALTER COLUMN "attended" SET DEFAULT 0,
ALTER COLUMN "total" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "appleMonthlyProductId" TEXT,
ADD COLUMN     "appleYearlyProductId" TEXT,
ADD COLUMN     "monthlyPriceFils" INTEGER,
ADD COLUMN     "previewLessonId" TEXT,
ADD COLUMN     "stripeMonthlyPriceId" TEXT,
ADD COLUMN     "stripeProductId" TEXT,
ADD COLUMN     "stripeYearlyPriceId" TEXT,
ADD COLUMN     "teacherCutPercent" INTEGER,
ADD COLUMN     "type" "CourseType" NOT NULL DEFAULT 'LIVE',
ADD COLUMN     "yearlyPriceFils" INTEGER;

-- AlterTable
ALTER TABLE "Earning" ADD COLUMN     "courseId" TEXT,
ADD COLUMN     "subscriptionPaymentId" TEXT,
ALTER COLUMN "batchId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Quiz" ADD COLUMN     "courseId" TEXT,
ADD COLUMN     "passPercent" INTEGER NOT NULL DEFAULT 70,
ALTER COLUMN "batchId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "LessonVideoPosition" (
    "userId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "positionSec" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LessonVideoPosition_pkey" PRIMARY KEY ("userId","lessonId")
);

-- CreateTable
CREATE TABLE "PlatformSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "liveCutPercent" INTEGER NOT NULL,
    "recordedCutPercent" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "plan" "SubscriptionPlan" NOT NULL,
    "provider" "SubscriptionProvider" NOT NULL,
    "status" "SubscriptionStatus" NOT NULL,
    "providerSubscriptionId" TEXT,
    "stripeCustomerId" TEXT,
    "appleOriginalTransactionId" TEXT,
    "appleAppAccountToken" TEXT,
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "priceFils" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionPayment" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "providerPaymentId" TEXT,
    "plan" "SubscriptionPlan" NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "subtotalFils" INTEGER NOT NULL,
    "vatFils" INTEGER NOT NULL,
    "totalFils" INTEGER NOT NULL,
    "feeFils" INTEGER NOT NULL DEFAULT 0,
    "refundedFils" INTEGER NOT NULL DEFAULT 0,
    "displayCurrency" TEXT NOT NULL DEFAULT 'AED',
    "fxRate" DECIMAL(12,6) NOT NULL DEFAULT 1,
    "status" "SubscriptionPaymentStatus" NOT NULL,
    "paidAt" TIMESTAMP(3),
    "bankAccountId" TEXT,
    "receiptUrl" TEXT,
    "expiresAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "reviewedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_providerSubscriptionId_key" ON "Subscription"("providerSubscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_appleOriginalTransactionId_key" ON "Subscription"("appleOriginalTransactionId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_appleAppAccountToken_key" ON "Subscription"("appleAppAccountToken");

-- CreateIndex
CREATE INDEX "Subscription_userId_courseId_idx" ON "Subscription"("userId", "courseId");

-- CreateIndex
CREATE INDEX "Subscription_status_currentPeriodEnd_idx" ON "Subscription"("status", "currentPeriodEnd");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionPayment_reference_key" ON "SubscriptionPayment"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionPayment_providerPaymentId_key" ON "SubscriptionPayment"("providerPaymentId");

-- CreateIndex
CREATE INDEX "SubscriptionPayment_subscriptionId_idx" ON "SubscriptionPayment"("subscriptionId");

-- CreateIndex
CREATE INDEX "SubscriptionPayment_status_idx" ON "SubscriptionPayment"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_userId_courseId_key" ON "Certificate"("userId", "courseId");

-- CreateIndex
CREATE UNIQUE INDEX "Course_appleMonthlyProductId_key" ON "Course"("appleMonthlyProductId");

-- CreateIndex
CREATE UNIQUE INDEX "Course_appleYearlyProductId_key" ON "Course"("appleYearlyProductId");

-- CreateIndex
CREATE UNIQUE INDEX "Earning_subscriptionPaymentId_kind_key" ON "Earning"("subscriptionPaymentId", "kind");

-- CreateIndex
CREATE INDEX "Quiz_courseId_status_idx" ON "Quiz"("courseId", "status");

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Earning" ADD CONSTRAINT "Earning_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Earning" ADD CONSTRAINT "Earning_subscriptionPaymentId_fkey" FOREIGN KEY ("subscriptionPaymentId") REFERENCES "SubscriptionPayment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonVideoPosition" ADD CONSTRAINT "LessonVideoPosition_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonVideoPosition" ADD CONSTRAINT "LessonVideoPosition_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionPayment" ADD CONSTRAINT "SubscriptionPayment_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionPayment" ADD CONSTRAINT "SubscriptionPayment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionPayment" ADD CONSTRAINT "SubscriptionPayment_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionPayment" ADD CONSTRAINT "SubscriptionPayment_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quiz" ADD CONSTRAINT "Quiz_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Platform default teacher cuts: one row, seeded from TEACHER_SHARE_PERCENT (60).
INSERT INTO "PlatformSettings" ("id", "liveCutPercent", "recordedCutPercent", "updatedAt")
VALUES ('default', 60, 60, CURRENT_TIMESTAMP);

-- One live plan per learner and course (Prisma cannot express a partial unique index).
CREATE UNIQUE INDEX "subscription_one_live_per_course" ON "Subscription"("userId", "courseId") WHERE status IN ('INCOMPLETE', 'ACTIVE', 'PAST_DUE', 'CANCELLING');
