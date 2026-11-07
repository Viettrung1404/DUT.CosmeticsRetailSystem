-- AlterTable
ALTER TABLE "inventory_transfer_items" ADD COLUMN     "quantity_approved" INTEGER;

-- AlterTable
ALTER TABLE "inventory_transfers" ADD COLUMN     "received_by" UUID,
ADD COLUMN     "shipped_by" UUID;

-- CreateTable
CREATE TABLE "inventory_adjustments" (
    "id" UUID NOT NULL,
    "adjustment_code" VARCHAR(50) NOT NULL,
    "store_id" UUID NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "reason" TEXT NOT NULL,
    "review_note" TEXT,
    "created_by" UUID,
    "approved_by" UUID,
    "approved_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_adjustment_items" (
    "id" UUID NOT NULL,
    "adjustment_id" UUID NOT NULL,
    "product_variant_id" UUID NOT NULL,
    "batch_id" UUID,
    "quantity" INTEGER NOT NULL,
    "batch_number" VARCHAR(100),
    "expiry_date" DATE,
    "manufacture_date" DATE,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_adjustment_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "inventory_adjustments_adjustment_code_key" ON "inventory_adjustments"("adjustment_code");

-- CreateIndex
CREATE INDEX "inventory_adjustments_store_id_status_idx" ON "inventory_adjustments"("store_id", "status");

-- AddForeignKey
ALTER TABLE "inventory_transfers" ADD CONSTRAINT "inventory_transfers_shipped_by_fkey" FOREIGN KEY ("shipped_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_transfers" ADD CONSTRAINT "inventory_transfers_received_by_fkey" FOREIGN KEY ("received_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_adjustments" ADD CONSTRAINT "inventory_adjustments_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_adjustments" ADD CONSTRAINT "inventory_adjustments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_adjustments" ADD CONSTRAINT "inventory_adjustments_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_adjustment_items" ADD CONSTRAINT "inventory_adjustment_items_adjustment_id_fkey" FOREIGN KEY ("adjustment_id") REFERENCES "inventory_adjustments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_adjustment_items" ADD CONSTRAINT "inventory_adjustment_items_product_variant_id_fkey" FOREIGN KEY ("product_variant_id") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_adjustment_items" ADD CONSTRAINT "inventory_adjustment_items_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Ràng buộc viết tay (Prisma không biểu diễn được CHECK)
ALTER TABLE "inventory_adjustments" ADD CONSTRAINT "chk_adjustment_status"
  CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'));
ALTER TABLE "inventory_adjustment_items" ADD CONSTRAINT "chk_adjustment_quantity_nonzero" CHECK (quantity <> 0);
ALTER TABLE "inventory_transfer_items" ADD CONSTRAINT "chk_transfer_quantity_approved"
  CHECK (quantity_approved IS NULL OR (quantity_approved >= 0 AND quantity_approved <= quantity_requested));
ALTER TABLE "inventory_transfers" ADD CONSTRAINT "chk_transfer_status"
  CHECK (status IN ('DRAFT', 'REQUESTED', 'APPROVED', 'SHIPPED', 'RECEIVED', 'CANCELLED'));
ALTER TABLE "stocktakes" ADD CONSTRAINT "chk_stocktake_status"
  CHECK (status IN ('DRAFT', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'));
