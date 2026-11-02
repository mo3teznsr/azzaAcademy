-- CreateEnum
CREATE TYPE "AttendanceMarkKind" AS ENUM ('PRESENT', 'LATE', 'LEFT_EARLY', 'ABSENT');

-- CreateEnum
CREATE TYPE "RescheduleRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'DECLINED');

-- CreateTable
CREATE TABLE "attendance_mark" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mark" "AttendanceMarkKind" NOT NULL,
    "markedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_mark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reschedule_request" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "status" "RescheduleRequestStatus" NOT NULL DEFAULT 'PENDING',
    "decidedById" TEXT,
    "decidedAt" TIMESTAMP(3),
    "decisionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reschedule_request_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "attendance_mark_sessionId_userId_key" ON "attendance_mark"("sessionId", "userId");

-- CreateIndex
CREATE INDEX "reschedule_request_status_createdAt_idx" ON "reschedule_request"("status", "createdAt");

-- CreateIndex
CREATE INDEX "reschedule_request_sessionId_idx" ON "reschedule_request"("sessionId");

-- AddForeignKey
ALTER TABLE "attendance_mark" ADD CONSTRAINT "attendance_mark_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "live_session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_mark" ADD CONSTRAINT "attendance_mark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reschedule_request" ADD CONSTRAINT "reschedule_request_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "live_session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reschedule_request" ADD CONSTRAINT "reschedule_request_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reschedule_request" ADD CONSTRAINT "reschedule_request_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
