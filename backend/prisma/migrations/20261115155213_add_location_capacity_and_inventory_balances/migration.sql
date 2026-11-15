-- AlterTable
ALTER TABLE "inventory" ADD COLUMN     "damaged_quantity" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "quarantined_quantity" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "safety_stock" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "stores" ADD COLUMN     "fulfillment_capacity_per_day" INTEGER NOT NULL DEFAULT 500;

-- CreateIndex
CREATE INDEX "idx_inventory_store_variant" ON "inventory"("store_id", "product_variant_id");
