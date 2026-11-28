-- AlterTable
ALTER TABLE "return_orders" ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "return_orders_status_created_at_dropoff_location_id_idx" ON "return_orders"("status", "created_at", "dropoff_location_id");
