-- Site settings: business rules (null = env default), public contact details and social links.
ALTER TABLE "PlatformSettings" ADD COLUMN "vatPercent" INTEGER,
ADD COLUMN "earningHoldDays" INTEGER,
ADD COLUMN "minPayoutAed" INTEGER,
ADD COLUMN "bankTransferHoldHours" INTEGER,
ADD COLUMN "contactEmail" TEXT,
ADD COLUMN "contactPhone" TEXT,
ADD COLUMN "whatsappNumber" TEXT,
ADD COLUMN "addressEn" TEXT,
ADD COLUMN "addressAr" TEXT,
ADD COLUMN "socials" JSONB NOT NULL DEFAULT '{}';
