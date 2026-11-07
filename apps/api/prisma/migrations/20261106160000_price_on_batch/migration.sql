-- Students buy a seat in a batch, so the batch carries the price. The course keeps only a "from" price
-- (lowest public batch), maintained by the API.

-- 1. Every batch gets an explicit price: its override, else the course's list price.
UPDATE "Batch" b SET "priceFils" = c."priceFils" FROM "Course" c WHERE b."courseId" = c."id" AND b."priceFils" IS NULL;
ALTER TABLE "Batch" ALTER COLUMN "priceFils" SET NOT NULL;

-- 2. The course price becomes the derived "from" price.
ALTER TABLE "Course" ALTER COLUMN "priceFils" DROP NOT NULL;
UPDATE "Course" c SET "priceFils" = (
  SELECT MIN(b."priceFils") FROM "Batch" b
  WHERE b."courseId" = c."id" AND b."status" IN ('ENROLLING', 'FULL', 'RUNNING')
);
