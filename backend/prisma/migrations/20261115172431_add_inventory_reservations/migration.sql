-- CreateTable: Bảng quản lý giữ chỗ tồn kho (Inventory Reservation Header)
CREATE TABLE "inventory_reservations" (
    "id" UUID NOT NULL,
    "order_id" UUID,
    "fulfillment_order_id" UUID,
    "location_id" UUID NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    "expires_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_reservations_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "chk_reservation_status" CHECK ("status" IN ('ACTIVE', 'RELEASED', 'EXPIRED', 'FULFILLED'))
);

-- CreateTable: Chi tiết giữ chỗ theo từng lô hàng (Inventory Reservation Items)
CREATE TABLE "inventory_reservation_items" (
    "id" UUID NOT NULL,
    "reservation_id" UUID NOT NULL,
    "product_variant_id" UUID NOT NULL,
    "lot_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "inventory_reservation_items_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "chk_res_item_quantity_positive" CHECK ("quantity" > 0)
);

-- CreateIndex
CREATE UNIQUE INDEX "inventory_reservations_fulfillment_order_id_key" ON "inventory_reservations"("fulfillment_order_id");

-- CreateIndex: Tối ưu cho Cronjob quét dọn dẹp các reservation hết hạn
CREATE INDEX "idx_res_cleanup" ON "inventory_reservations"("status", "expires_at");

-- CreateIndex
CREATE INDEX "idx_reservation_items_res_id" ON "inventory_reservation_items"("reservation_id");

-- AddForeignKey
ALTER TABLE "inventory_reservations" ADD CONSTRAINT "inventory_reservations_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_reservations" ADD CONSTRAINT "inventory_reservations_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_reservation_items" ADD CONSTRAINT "inventory_reservation_items_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "inventory_reservations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_reservation_items" ADD CONSTRAINT "inventory_reservation_items_product_variant_id_fkey" FOREIGN KEY ("product_variant_id") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_reservation_items" ADD CONSTRAINT "inventory_reservation_items_lot_id_fkey" FOREIGN KEY ("lot_id") REFERENCES "inventory_lots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
