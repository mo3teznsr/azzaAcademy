-- Apple App Store commission on in-app purchases (percent of the price before VAT); null = APPLE_COMMISSION_PERCENT.
ALTER TABLE "PlatformSettings" ADD COLUMN "appleCommissionPercent" INTEGER;
