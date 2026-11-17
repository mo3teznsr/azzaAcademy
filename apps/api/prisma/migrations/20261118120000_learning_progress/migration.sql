-- Weekly learning goals and personal badges (docs/PROGRESS.md).
CREATE TYPE "LearningGoalUnit" AS ENUM ('DAYS', 'LESSONS');

CREATE TABLE "LearningGoal" (
    "userId" TEXT NOT NULL,
    "unit" "LearningGoalUnit" NOT NULL,
    "target" INTEGER NOT NULL,
    "reminders" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LearningGoal_pkey" PRIMARY KEY ("userId")
);
ALTER TABLE "LearningGoal" ADD CONSTRAINT "LearningGoal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "LearnerBadge" (
    "userId" TEXT NOT NULL,
    "badge" TEXT NOT NULL,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LearnerBadge_pkey" PRIMARY KEY ("userId","badge")
);
ALTER TABLE "LearnerBadge" ADD CONSTRAINT "LearnerBadge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
