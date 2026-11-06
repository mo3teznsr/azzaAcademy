-- Managed categories: one row per distinct free-text category, courses now store the slug.
CREATE TABLE "Category" (
    "slug" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameAr" TEXT,
    "icon" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Category_pkey" PRIMARY KEY ("slug")
);

CREATE TEMP TABLE "_cat_map" AS
SELECT DISTINCT "category" AS "old",
  COALESCE(NULLIF(trim(both '-' from lower(regexp_replace(trim("category"), '[^a-zA-Z0-9]+', '-', 'g'))), ''), 'category-' || substr(md5("category"), 1, 8)) AS "slug"
FROM "Course";

INSERT INTO "Category" ("slug", "nameEn")
SELECT DISTINCT ON ("slug") "slug", trim("old") FROM "_cat_map" ORDER BY "slug", "old";

UPDATE "Course" c SET "category" = m."slug" FROM "_cat_map" m WHERE c."category" = m."old";

ALTER TABLE "Course" ADD CONSTRAINT "Course_category_fkey" FOREIGN KEY ("category") REFERENCES "Category"("slug") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Rich course detail, featured rail, rating aggregate.
ALTER TABLE "Course"
  ADD COLUMN "outcomesEn" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "outcomesAr" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "requirementsEn" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "requirementsAr" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "audienceEn" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "audienceAr" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "faq" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN "featuredRank" INTEGER,
  ADD COLUMN "ratingAvg" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "ratingCount" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "CourseModule" ADD COLUMN "descriptionEn" TEXT, ADD COLUMN "descriptionAr" TEXT;

CREATE TABLE "CourseReview" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "body" TEXT NOT NULL DEFAULT '',
    "teacherReply" TEXT,
    "repliedAt" TIMESTAMP(3),
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CourseReview_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CourseReview_courseId_userId_key" ON "CourseReview"("courseId", "userId");
CREATE INDEX "CourseReview_courseId_hidden_createdAt_idx" ON "CourseReview"("courseId", "hidden", "createdAt");
ALTER TABLE "CourseReview" ADD CONSTRAINT "CourseReview_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CourseReview" ADD CONSTRAINT "CourseReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "SavedCourse" (
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SavedCourse_pkey" PRIMARY KEY ("userId", "courseId")
);
CREATE INDEX "SavedCourse_courseId_idx" ON "SavedCourse"("courseId");
ALTER TABLE "SavedCourse" ADD CONSTRAINT "SavedCourse_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SavedCourse" ADD CONSTRAINT "SavedCourse_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
