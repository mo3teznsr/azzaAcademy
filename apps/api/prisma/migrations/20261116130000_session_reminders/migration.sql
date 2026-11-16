-- Reminders before live sessions (24 h, 1 h, 10 min) and the "you missed it, here's the recording" notice.
ALTER TABLE "LiveSession" ADD COLUMN "reminderDayAt" TIMESTAMP(3),
ADD COLUMN "reminderHourAt" TIMESTAMP(3),
ADD COLUMN "reminderSoonAt" TIMESTAMP(3),
ADD COLUMN "missedNoticeAt" TIMESTAMP(3);
-- Existing past sessions need no notices.
UPDATE "LiveSession" SET "missedNoticeAt" = NOW() WHERE "status" = 'ENDED';
