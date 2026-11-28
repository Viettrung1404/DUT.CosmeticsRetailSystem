-- AlterTable: Bổ sung min_shelf_life_days với giá trị mặc định 180 ngày theo DES-05 / DES-06
ALTER TABLE "product_variants" ADD COLUMN "min_shelf_life_days" INTEGER NOT NULL DEFAULT 180;

-- Ràng buộc không âm cho hạn lưu hành tối thiểu
ALTER TABLE "product_variants" ADD CONSTRAINT "chk_product_variant_min_shelf_life_non_negative" CHECK ("min_shelf_life_days" >= 0);

-- CreateTable: Tạo bảng inventory_lots lưu trữ lô hàng theo địa điểm
CREATE TABLE "inventory_lots" (
    "id" UUID NOT NULL,
    "location_id" UUID NOT NULL,
    "product_variant_id" UUID NOT NULL,
    "batch_code" VARCHAR(100) NOT NULL,
    "expiry_date" DATE NOT NULL,
    "quantity_on_hand" INTEGER NOT NULL DEFAULT 0,
    "quantity_reserved" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_lots_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "chk_lot_quantity_on_hand_non_negative" CHECK ("quantity_on_hand" >= 0),
    CONSTRAINT "chk_lot_quantity_reserved_non_negative" CHECK ("quantity_reserved" >= 0),
    CONSTRAINT "chk_lot_quantities" CHECK ("quantity_on_hand" >= "quantity_reserved")
);

-- CreateIndex: Tối ưu hóa truy vấn FEFO (sắp xếp tăng dần theo expiry_date)
CREATE INDEX "idx_lots_fefo_search" ON "inventory_lots"("location_id", "product_variant_id", "expiry_date" ASC);

-- CreateIndex: Ràng buộc duy nhất mã lô tại cùng một địa điểm và biến thể sản phẩm
CREATE UNIQUE INDEX "uq_lot_batch" ON "inventory_lots"("location_id", "product_variant_id", "batch_code");

-- AddForeignKey
ALTER TABLE "inventory_lots" ADD CONSTRAINT "inventory_lots_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_lots" ADD CONSTRAINT "inventory_lots_product_variant_id_fkey" FOREIGN KEY ("product_variant_id") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
