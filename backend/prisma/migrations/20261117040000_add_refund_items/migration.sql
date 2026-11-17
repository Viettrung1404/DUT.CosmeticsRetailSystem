-- Migration: 20261117040000_add_refund_items
-- Purpose: Bảng lưu chi tiết từng món hàng trong lệnh hoàn tiền (refund_items), kiểm soát chống hoàn trùng từng dòng sản phẩm

CREATE TABLE IF NOT EXISTS refund_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    refund_id UUID NOT NULL REFERENCES refunds(id) ON DELETE CASCADE,
    order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE RESTRICT,
    return_item_id UUID REFERENCES return_order_items(id) ON DELETE SET NULL,
    quantity INT NOT NULL DEFAULT 1,
    amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    points_restored INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT chk_refund_items_quantity_positive CHECK (quantity > 0),
    CONSTRAINT chk_refund_items_amount_non_negative CHECK (amount >= 0),
    CONSTRAINT chk_refund_items_points_non_negative CHECK (points_restored >= 0)
);

CREATE INDEX IF NOT EXISTS idx_refund_items_refund ON refund_items(refund_id);
CREATE INDEX IF NOT EXISTS idx_refund_items_order_item ON refund_items(order_item_id);
CREATE INDEX IF NOT EXISTS idx_refund_items_return_item ON refund_items(return_item_id);
