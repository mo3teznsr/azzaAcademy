-- When the "your bank transfer hold ends soon" reminder went out.
ALTER TABLE "Order" ADD COLUMN "receiptReminderAt" TIMESTAMP(3);
