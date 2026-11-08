-- Display currencies become admin-managed data. FxRate's rates move into Currency, then FxRate is dropped.
CREATE TABLE "Currency" (
    "code" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "symbol" TEXT,
    "decimals" INTEGER NOT NULL DEFAULT 2,
    "ratePerAed" DECIMAL(12,6) NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Currency_pkey" PRIMARY KEY ("code")
);

-- The four defaults, with the rates admins already set where they exist (else fx.service's defaults).
INSERT INTO "Currency" ("code", "nameEn", "nameAr", "symbol", "decimals", "ratePerAed", "enabled", "sortOrder", "updatedAt")
SELECT d."code", d."nameEn", d."nameAr", d."symbol", d."decimals",
       CASE WHEN d."code" = 'AED' THEN 1 ELSE COALESCE(f."ratePerAed", d."rate") END,
       true, d."sortOrder", CURRENT_TIMESTAMP
FROM (VALUES
    ('AED', 'UAE Dirham',    'درهم إماراتي', 'AED', 2, 1.000000::DECIMAL(12,6), 0),
    ('SAR', 'Saudi Riyal',   'ريال سعودي',   'SAR', 0, 1.021100::DECIMAL(12,6), 1),
    ('QAR', 'Qatari Riyal',  'ريال قطري',    'QAR', 0, 0.991200::DECIMAL(12,6), 2),
    ('USD', 'US Dollar',     'دولار أمريكي', '$',   0, 0.272300::DECIMAL(12,6), 3)
) AS d("code", "nameEn", "nameAr", "symbol", "decimals", "rate", "sortOrder")
LEFT JOIN "FxRate" f ON f."currency" = d."code"
ON CONFLICT ("code") DO NOTHING;

-- Any other rate an admin stored (none expected) is kept, named by its code.
INSERT INTO "Currency" ("code", "nameEn", "nameAr", "symbol", "decimals", "ratePerAed", "enabled", "sortOrder", "updatedAt")
SELECT f."currency", f."currency", f."currency", NULL, 2, f."ratePerAed", true, 100, f."updatedAt"
FROM "FxRate" f
WHERE f."currency" ~ '^[A-Z]{3}$'
ON CONFLICT ("code") DO NOTHING;

DROP TABLE "FxRate";
