-- Migration: Add Return Receipts table for Multi-Channel Reverse Logistics (Epic 14)

CREATE TABLE IF NOT EXISTS "return_receipts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "receipt_code" VARCHAR(60) NOT NULL,
    "return_order_id" UUID NOT NULL,
    "location_id" UUID NOT NULL,
    "received_by" UUID,
    "received_items_count" INT NOT NULL DEFAULT 0,
    "package_condition_note" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "return_receipts_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "return_receipts_receipt_code_key" UNIQUE ("receipt_code"),
    CONSTRAINT "fk_return_receipts_return_order" FOREIGN KEY ("return_order_id") REFERENCES "return_orders"("id") ON DELETE CASCADE,
    CONSTRAINT "fk_return_receipts_location" FOREIGN KEY ("location_id") REFERENCES "stores"("id") ON DELETE RESTRICT,
    CONSTRAINT "fk_return_receipts_received_by" FOREIGN KEY ("received_by") REFERENCES "users"("id") ON DELETE SET NULL
);

-- Indexing for fast lookups
CREATE INDEX IF NOT EXISTS "idx_return_receipts_return_order_id" ON "return_receipts"("return_order_id");
CREATE INDEX IF NOT EXISTS "idx_return_receipts_location_id" ON "return_receipts"("location_id");
CREATE INDEX IF NOT EXISTS "idx_return_receipts_created_at" ON "return_receipts"("created_at");
