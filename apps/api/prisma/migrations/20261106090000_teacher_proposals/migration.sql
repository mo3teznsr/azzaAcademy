-- Teachers propose courses and batches; admins approve them. (Idempotent: safe to re-run after a partial apply.)
ALTER TYPE "CourseStatus" ADD VALUE IF NOT EXISTS 'PENDING_REVIEW' BEFORE 'PUBLISHED';
ALTER TYPE "BatchStatus" ADD VALUE IF NOT EXISTS 'PENDING_REVIEW' BEFORE 'ENROLLING';

ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "createdById" TEXT,
ADD COLUMN IF NOT EXISTS "reviewNote" TEXT,
ADD COLUMN IF NOT EXISTS "submittedAt" TIMESTAMP(3);

ALTER TABLE "Batch" ADD COLUMN IF NOT EXISTS "reviewNote" TEXT,
ADD COLUMN IF NOT EXISTS "submittedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Course_createdById_idx" ON "Course"("createdById");

DO $$ BEGIN
  ALTER TABLE "Course" ADD CONSTRAINT "Course_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
