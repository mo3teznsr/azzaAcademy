-- Renewal reminders: remember the period end each reminder was sent for, so a period is reminded once.
ALTER TABLE "Subscription" ADD COLUMN "reminderSentForPeriodEnd" TIMESTAMP(3),
ADD COLUMN "reminderEndDaySentFor" TIMESTAMP(3);
