-- =============================================================================
-- Bổ sung các tính năng PostgreSQL mà schema.prisma không biểu diễn được.
-- Nguồn: docs/2-design/04_thiet_ke_csdl.md (mục 3, 4.2, 4.3, Phụ lục A.3).
-- Migration init_db chỉ chứa phần Prisma tự sinh; mọi phần viết tay nằm ở file này.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Cột GENERATED (tự tính, chỉ đọc) — 3 cột
--    Prisma tạo chúng thành cột thường; xóa đi rồi tạo lại dạng GENERATED ... STORED.
--    An toàn vì bảng chưa có dữ liệu thật.
-- -----------------------------------------------------------------------------

-- Tồn khả dụng để bán (ATP) = tồn thực tế - số lượng đang giữ chỗ cho đơn Online (mục 3.3, bảng 15)
ALTER TABLE "inventory" DROP COLUMN "available_quantity";
ALTER TABLE "inventory"
    ADD COLUMN "available_quantity" INTEGER GENERATED ALWAYS AS ("quantity" - "reserved_quantity") STORED;

-- Số lượng thất thoát khi chuyển kho = đã gửi - đã nhận (bảng 19)
ALTER TABLE "inventory_transfer_items" DROP COLUMN "loss_quantity";
ALTER TABLE "inventory_transfer_items"
    ADD COLUMN "loss_quantity" INTEGER GENERATED ALWAYS AS ("quantity_shipped" - "quantity_received") STORED;

-- Số lượng lệch khi kiểm kê = thực tế - trên hệ thống (bảng 21)
ALTER TABLE "stocktake_items" DROP COLUMN "variance_quantity";
ALTER TABLE "stocktake_items"
    ADD COLUMN "variance_quantity" INTEGER GENERATED ALWAYS AS ("actual_quantity" - "system_quantity") STORED;


-- -----------------------------------------------------------------------------
-- 2. CHECK — 11 ràng buộc
-- -----------------------------------------------------------------------------

-- Chặn tràn sang bit 63 (bit dấu của BIGINT) — Phụ lục A.3
ALTER TABLE "permissions"
    ADD CONSTRAINT "chk_permissions_bit_position" CHECK ("bit_position" BETWEEN 0 AND 62);

-- Tồn kho không âm, giữ chỗ không vượt tồn thực tế (bảng 15)
ALTER TABLE "inventory"
    ADD CONSTRAINT "chk_inventory_quantity_non_negative" CHECK ("quantity" >= 0),
    ADD CONSTRAINT "chk_inventory_reserved_non_negative" CHECK ("reserved_quantity" >= 0),
    ADD CONSTRAINT "chk_inventory_reserved_le_quantity" CHECK ("quantity" >= "reserved_quantity");

-- Số lượng còn trong lô không âm (bảng 17)
ALTER TABLE "batches"
    ADD CONSTRAINT "chk_batches_quantity_non_negative" CHECK ("quantity" >= 0);

-- Số lượng trên các dòng chi tiết phải dương (bảng 23, 25, 26, 30, 62)
ALTER TABLE "cart_items"
    ADD CONSTRAINT "chk_cart_items_quantity_positive" CHECK ("quantity" > 0);
ALTER TABLE "order_items"
    ADD CONSTRAINT "chk_order_items_quantity_positive" CHECK ("quantity" > 0);
ALTER TABLE "order_item_batches"
    ADD CONSTRAINT "chk_order_item_batches_quantity_positive" CHECK ("quantity" > 0);
ALTER TABLE "return_order_items"
    ADD CONSTRAINT "chk_return_order_items_quantity_positive" CHECK ("quantity" > 0);
ALTER TABLE "invoice_items"
    ADD CONSTRAINT "chk_invoice_items_quantity_positive" CHECK ("quantity" > 0);

-- Điểm đánh giá từ 1 đến 5 sao (bảng 39)
ALTER TABLE "reviews"
    ADD CONSTRAINT "chk_reviews_rating_range" CHECK ("rating" BETWEEN 1 AND 5);


-- -----------------------------------------------------------------------------
-- 3. UNIQUE NULLS NOT DISTINCT — tổ hợp biến thể không trùng kể cả khi có NULL (bảng 10)
--    UNIQUE thường của PostgreSQL coi NULL <> NULL, nên 2 biến thể cùng option NULL vẫn lọt.
--    Giữ nguyên tên index Prisma đặt để Prisma vẫn nhận ra nó.
-- -----------------------------------------------------------------------------
DROP INDEX "product_variants_product_id_option1_value_option2_value_opt_key";
CREATE UNIQUE INDEX "product_variants_product_id_option1_value_option2_value_opt_key"
    ON "product_variants" ("product_id", "option1_value", "option2_value", "option3_value")
    NULLS NOT DISTINCT;


-- -----------------------------------------------------------------------------
-- 4. Partial index (index một phần) — 5 index, mục 4.3
-- -----------------------------------------------------------------------------
CREATE INDEX "idx_products_active"
    ON "products" ("id") WHERE "is_active" = TRUE;

CREATE INDEX "idx_coupons_active"
    ON "coupons" ("code") WHERE "is_active" = TRUE;

CREATE INDEX "idx_inventory_low_stock"
    ON "inventory" ("store_id", "product_variant_id") WHERE "quantity" <= "min_quantity";

-- Gợi ý xuất kho FEFO: lô còn hàng, hết hạn sớm nhất đứng trước (BR-08)
CREATE INDEX "idx_batches_fefo_active"
    ON "batches" ("product_variant_id", "store_id", "expiry_date" ASC)
    WHERE "is_active" = TRUE AND "quantity" > 0;

CREATE INDEX "idx_orders_einvoice_pending"
    ON "orders" ("id") WHERE "einvoice_status" = 'PENDING';


-- -----------------------------------------------------------------------------
-- 5. GIN index — tìm kiếm toàn văn & truy vấn JSON, mục 4.2
-- -----------------------------------------------------------------------------
CREATE INDEX "idx_products_fts"
    ON "products" USING GIN (to_tsvector('simple', "name" || ' ' || COALESCE("description", '')));

CREATE INDEX "idx_settings_value"
    ON "settings" USING GIN ("value");

CREATE INDEX "idx_orders_shipping_address"
    ON "orders" USING GIN ("shipping_address");

CREATE INDEX "idx_shipments_carrier_metadata"
    ON "shipments" USING GIN ("carrier_metadata");
