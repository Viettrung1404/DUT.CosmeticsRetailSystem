-- =============================================================================
-- Migration: 20261115155239_add_location_capacity_and_inventory_balances
-- Mục đích: Bổ sung ràng buộc toàn vẹn logic số dư tồn kho (Inventory Balances)
-- và cập nhật cột tự sinh ATP (available_quantity) theo chuẩn DES-05 / DES-06.
-- =============================================================================

-- 1. Xóa ràng buộc cũ nếu tồn tại (vì đã được bao hàm trong ràng buộc tổng hợp)
ALTER TABLE "inventory"
    DROP CONSTRAINT IF EXISTS "chk_inventory_reserved_le_quantity";

-- 2. Bổ sung ràng buộc không âm cho các phân đoạn tồn kho mới
ALTER TABLE "inventory"
    ADD CONSTRAINT "chk_inventory_safety_non_negative" CHECK ("safety_stock" >= 0),
    ADD CONSTRAINT "chk_inventory_quarantined_non_negative" CHECK ("quarantined_quantity" >= 0),
    ADD CONSTRAINT "chk_inventory_damaged_non_negative" CHECK ("damaged_quantity" >= 0);

-- 3. Ràng buộc toàn vẹn số dư tồn kho logic:
-- physical on hand (quantity) >= (reserved + safety + quarantined + damaged)
ALTER TABLE "inventory"
    ADD CONSTRAINT "chk_inventory_balances_logical"
    CHECK ("quantity" >= ("reserved_quantity" + "safety_stock" + "quarantined_quantity" + "damaged_quantity"));

-- 4. Cập nhật lại cột GENERATED ALWAYS STORED cho available_quantity (ATP khả dụng bán lẻ)
ALTER TABLE "inventory" DROP COLUMN IF EXISTS "available_quantity";
ALTER TABLE "inventory"
    ADD COLUMN "available_quantity" INTEGER GENERATED ALWAYS AS ("quantity" - ("reserved_quantity" + "safety_stock" + "quarantined_quantity" + "damaged_quantity")) STORED;
