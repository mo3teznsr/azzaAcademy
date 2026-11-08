-- App Store product sync: last result per recorded course and per class-seat price.
ALTER TABLE "Course" ADD COLUMN "appleSyncStatus" TEXT,
ADD COLUMN "appleSyncDetail" TEXT,
ADD COLUMN "appleSyncedAt" TIMESTAMP(3);

CREATE TABLE "AppleSeatProduct" (
    "priceFils" INTEGER NOT NULL,
    "productId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "detail" TEXT,
    "syncedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppleSeatProduct_pkey" PRIMARY KEY ("priceFils")
);
