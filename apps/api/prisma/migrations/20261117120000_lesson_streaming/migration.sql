-- Adaptive streaming (HLS) and offline downloads for lesson videos.
CREATE TYPE "VideoStreamStatus" AS ENUM ('PROCESSING', 'READY', 'FAILED');

ALTER TABLE "Lesson" ADD COLUMN "streamStatus" "VideoStreamStatus";
ALTER TABLE "Lesson" ADD COLUMN "streamProvider" TEXT;
ALTER TABLE "Lesson" ADD COLUMN "streamAssetId" TEXT;
ALTER TABLE "Lesson" ADD COLUMN "streamSourceUrl" TEXT;
ALTER TABLE "Lesson" ADD COLUMN "hlsUrl" TEXT;
ALTER TABLE "Lesson" ADD COLUMN "posterUrl" TEXT;
ALTER TABLE "Lesson" ADD COLUMN "lowMp4Url" TEXT;
ALTER TABLE "Lesson" ADD COLUMN "durationSec" INTEGER;
ALTER TABLE "Lesson" ADD COLUMN "streamError" TEXT;
ALTER TABLE "Lesson" ADD COLUMN "streamUpdatedAt" TIMESTAMP(3);

CREATE INDEX "Lesson_streamStatus_idx" ON "Lesson"("streamStatus");
CREATE INDEX "Lesson_streamAssetId_idx" ON "Lesson"("streamAssetId");
