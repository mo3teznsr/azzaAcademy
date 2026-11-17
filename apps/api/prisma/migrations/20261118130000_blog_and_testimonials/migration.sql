-- Testimonials: the learner's consent to be quoted, and the admin's pick.
ALTER TABLE "CourseReview" ADD COLUMN "quoteConsent" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "CourseReview" ADD COLUMN "featuredAt" TIMESTAMP(3);
CREATE INDEX "CourseReview_featuredAt_idx" ON "CourseReview"("featuredAt");

-- Blog: admin-written articles (Arabic required, English optional) with related courses.
CREATE TYPE "BlogPostStatus" AS ENUM ('DRAFT', 'PUBLISHED');

CREATE TABLE "BlogPost" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "titleAr" TEXT NOT NULL,
    "titleEn" TEXT,
    "excerptAr" TEXT NOT NULL DEFAULT '',
    "excerptEn" TEXT,
    "bodyAr" TEXT NOT NULL,
    "bodyEn" TEXT,
    "coverImageUrl" TEXT,
    "categorySlug" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "authorId" TEXT,
    "status" "BlogPostStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BlogPost_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "BlogPost_slug_key" ON "BlogPost"("slug");
CREATE INDEX "BlogPost_status_publishedAt_idx" ON "BlogPost"("status", "publishedAt");
CREATE INDEX "BlogPost_categorySlug_idx" ON "BlogPost"("categorySlug");
ALTER TABLE "BlogPost" ADD CONSTRAINT "BlogPost_categorySlug_fkey" FOREIGN KEY ("categorySlug") REFERENCES "Category"("slug") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BlogPost" ADD CONSTRAINT "BlogPost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "BlogPostCourse" (
    "postId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "BlogPostCourse_pkey" PRIMARY KEY ("postId", "courseId")
);
CREATE INDEX "BlogPostCourse_courseId_idx" ON "BlogPostCourse"("courseId");
ALTER TABLE "BlogPostCourse" ADD CONSTRAINT "BlogPostCourse_postId_fkey" FOREIGN KEY ("postId") REFERENCES "BlogPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BlogPostCourse" ADD CONSTRAINT "BlogPostCourse_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
