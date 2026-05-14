-- Add payment source columns to Loan and MSIPurchase
ALTER TABLE "Loan" ADD COLUMN "sourceAccountId" TEXT;
ALTER TABLE "MSIPurchase" ADD COLUMN "sourceKind" "SourceKind";
ALTER TABLE "MSIPurchase" ADD COLUMN "sourceId" TEXT;
