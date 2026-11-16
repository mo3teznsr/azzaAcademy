-- Where users and orders came from (UTM tags, ad click ids, referrer).
ALTER TABLE "user" ADD COLUMN "acquisition" TEXT;
ALTER TABLE "Order" ADD COLUMN "attribution" JSONB;
