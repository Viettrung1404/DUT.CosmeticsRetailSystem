-- CreateTable: Bảng quản lý đơn hoàn tất (Fulfillment Order Header) theo DES-05 & DES-07 EP03-T03
CREATE TABLE "fulfillment_orders" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "fulfillment_order_number" VARCHAR(60) NOT NULL,
    "source_location_id" UUID NOT NULL,
    "status" VARCHAR(35) NOT NULL DEFAULT 'PENDING_ALLOCATION',
    "shipping_service_code" VARCHAR(50) NOT NULL,
    "total_items_count" INTEGER NOT NULL,
    "assigned_picker_id" UUID,
    "allocated_at" TIMESTAMPTZ,
    "packed_at" TIMESTAMPTZ,
    "handed_over_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fulfillment_orders_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "chk_fo_status" CHECK ("status" IN ('PENDING_ALLOCATION', 'ALLOCATED', 'PICKING', 'PICKED', 'PACKING', 'PACKED', 'READY_FOR_HANDOVER', 'HANDED_OVER', 'COMPLETED', 'CANCELLED')),
    CONSTRAINT "chk_fo_total_items_count_positive" CHECK ("total_items_count" > 0)
);

-- CreateTable: Chi tiết sản phẩm trong đơn hoàn tất (Fulfillment Order Items)
CREATE TABLE "fulfillment_order_items" (
    "id" UUID NOT NULL,
    "fulfillment_order_id" UUID NOT NULL,
    "order_item_id" UUID NOT NULL,
    "product_variant_id" UUID NOT NULL,
    "quantity_requested" INTEGER NOT NULL,
    "quantity_fulfilled" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fulfillment_order_items_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "chk_fo_item_qty_requested_positive" CHECK ("quantity_requested" > 0),
    CONSTRAINT "chk_fo_item_qty_fulfilled_non_negative" CHECK ("quantity_fulfilled" >= 0)
);

-- CreateIndex
CREATE UNIQUE INDEX "fulfillment_orders_fulfillment_order_number_key" ON "fulfillment_orders"("fulfillment_order_number");
CREATE INDEX "idx_fo_location_status" ON "fulfillment_orders"("source_location_id", "status");
CREATE INDEX "idx_fo_order_id" ON "fulfillment_orders"("order_id");

-- CreateIndex
CREATE INDEX "idx_fo_items_fo_id" ON "fulfillment_order_items"("fulfillment_order_id");
CREATE INDEX "idx_fo_items_order_item_id" ON "fulfillment_order_items"("order_item_id");

-- AddForeignKey
ALTER TABLE "fulfillment_orders" ADD CONSTRAINT "fulfillment_orders_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "fulfillment_orders" ADD CONSTRAINT "fulfillment_orders_source_location_id_fkey" FOREIGN KEY ("source_location_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "fulfillment_order_items" ADD CONSTRAINT "fulfillment_order_items_fulfillment_order_id_fkey" FOREIGN KEY ("fulfillment_order_id") REFERENCES "fulfillment_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "fulfillment_order_items" ADD CONSTRAINT "fulfillment_order_items_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "fulfillment_order_items" ADD CONSTRAINT "fulfillment_order_items_product_variant_id_fkey" FOREIGN KEY ("product_variant_id") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey to inventory_reservations
ALTER TABLE "inventory_reservations" ADD CONSTRAINT "inventory_reservations_fulfillment_order_id_fkey" FOREIGN KEY ("fulfillment_order_id") REFERENCES "fulfillment_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
