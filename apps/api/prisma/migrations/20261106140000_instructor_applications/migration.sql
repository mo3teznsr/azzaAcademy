-- "Join as instructor" applications, reviewed by admins.
CREATE TYPE "InstructorApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "InstructorApplication" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "headline" TEXT NOT NULL,
    "bio" TEXT NOT NULL,
    "categories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "languages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "experience" TEXT NOT NULL,
    "sampleUrl" TEXT,
    "phone" TEXT,
    "status" "InstructorApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "reviewNote" TEXT,
    "decidedById" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "InstructorApplication_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "InstructorApplication_status_createdAt_idx" ON "InstructorApplication"("status", "createdAt");
CREATE INDEX "InstructorApplication_userId_idx" ON "InstructorApplication"("userId");
ALTER TABLE "InstructorApplication" ADD CONSTRAINT "InstructorApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
