-- AlterTable
ALTER TABLE "User" ADD COLUMN     "payAnchorDate" TIMESTAMP(3),
ADD COLUMN     "payWeekday" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN     "paymentSchedule" TEXT NOT NULL DEFAULT 'monthly';
