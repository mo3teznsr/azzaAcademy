-- Referral program: personal codes, who referred whom, personal reward coupons and the program rules.
ALTER TABLE "user" ADD COLUMN "referralCode" TEXT;
CREATE UNIQUE INDEX "user_referralCode_key" ON "user"("referralCode");

ALTER TABLE "Coupon" ADD COLUMN "ownerId" TEXT;
CREATE INDEX "Coupon_ownerId_idx" ON "Coupon"("ownerId");
ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TYPE "ReferralStatus" AS ENUM ('PENDING', 'QUALIFIED', 'REWARDED', 'VOID');

CREATE TABLE "Referral" (
    "id" TEXT NOT NULL,
    "referrerId" TEXT NOT NULL,
    "referredId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" "ReferralStatus" NOT NULL DEFAULT 'PENDING',
    "firstPaymentKind" TEXT,
    "firstPaymentId" TEXT,
    "firstPaidAt" TIMESTAMP(3),
    "qualifiedAt" TIMESTAMP(3),
    "rewardedAt" TIMESTAMP(3),
    "voidedAt" TIMESTAMP(3),
    "referrerCouponId" TEXT,
    "referredCouponId" TEXT,
    "referrerEarningId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Referral_referredId_key" ON "Referral"("referredId");
CREATE UNIQUE INDEX "Referral_referrerCouponId_key" ON "Referral"("referrerCouponId");
CREATE UNIQUE INDEX "Referral_referredCouponId_key" ON "Referral"("referredCouponId");
CREATE UNIQUE INDEX "Referral_referrerEarningId_key" ON "Referral"("referrerEarningId");
CREATE INDEX "Referral_referrerId_status_idx" ON "Referral"("referrerId", "status");
CREATE INDEX "Referral_status_idx" ON "Referral"("status");
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_referredId_fkey" FOREIGN KEY ("referredId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_referrerCouponId_fkey" FOREIGN KEY ("referrerCouponId") REFERENCES "Coupon"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_referredCouponId_fkey" FOREIGN KEY ("referredCouponId") REFERENCES "Coupon"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_referrerEarningId_fkey" FOREIGN KEY ("referrerEarningId") REFERENCES "Earning"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "ReferralProgram" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "rewardType" TEXT NOT NULL DEFAULT 'PERCENT',
    "rewardValue" INTEGER NOT NULL DEFAULT 10,
    "couponValidDays" INTEGER NOT NULL DEFAULT 90,
    "teacherBonusFils" INTEGER NOT NULL DEFAULT 2500,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ReferralProgram_pkey" PRIMARY KEY ("id")
);
