-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "points_discount" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "tendered_amount" DECIMAL(12,2);
