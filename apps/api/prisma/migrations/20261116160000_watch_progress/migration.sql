-- How far into a lesson video the learner got, and its length: uploaded videos complete once mostly watched.
ALTER TABLE "LessonVideoPosition" ADD COLUMN "maxSec" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "durationSec" INTEGER;
UPDATE "LessonVideoPosition" SET "maxSec" = "positionSec";
