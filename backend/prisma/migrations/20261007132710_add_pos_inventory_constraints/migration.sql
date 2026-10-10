-- CreateIndex
CREATE INDEX "idx_inventory_transactions_store_created" ON "inventory_transactions"("store_id", "created_at" DESC);

-- Mỗi cửa hàng chỉ một ca POS đang mở; chặn ở DB để hai người bấm mở ca cùng lúc không lọt
CREATE UNIQUE INDEX "uq_pos_sessions_store_open"
    ON "pos_sessions" ("store_id") WHERE "status" = 'OPEN';

ALTER TABLE "pos_sessions"
    ADD CONSTRAINT "chk_pos_sessions_opening_cash_non_negative" CHECK ("opening_cash" >= 0);

ALTER TABLE "purchase_order_items"
    ADD CONSTRAINT "chk_purchase_order_items_ordered_positive" CHECK ("quantity_ordered" > 0),
    ADD CONSTRAINT "chk_purchase_order_items_received_non_negative" CHECK ("quantity_received" >= 0);
