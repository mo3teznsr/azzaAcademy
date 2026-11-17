-- Welcome, inactivity and win-back messages sent to each learner (never twice).
CREATE TABLE "LifecycleMessage" (
    "userId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LifecycleMessage_pkey" PRIMARY KEY ("userId","key")
);
ALTER TABLE "LifecycleMessage" ADD CONSTRAINT "LifecycleMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
