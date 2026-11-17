-- Migration: 20261117030000_add_qc_inspections_and_dispositions
-- Epic: EPIC 15 - QC Inspection & Inventory Disposition

-- 1. Create Table: return_inspections
CREATE TABLE IF NOT EXISTS "return_inspections" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "inspection_code" VARCHAR(60) NOT NULL,
    "return_order_id" UUID NOT NULL,
    "inspector_id" UUID,
    "overall_result" VARCHAR(30) NOT NULL,
    "inspector_notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "return_inspections_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "return_inspections_inspection_code_key" UNIQUE ("inspection_code"),
    CONSTRAINT "fk_return_inspections_return_order" FOREIGN KEY ("return_order_id") REFERENCES "return_orders"("id") ON DELETE CASCADE,
    CONSTRAINT "fk_return_inspections_inspector" FOREIGN KEY ("inspector_id") REFERENCES "users"("id") ON DELETE SET NULL,
    CONSTRAINT "chk_inspection_overall_result" CHECK ("overall_result" IN ('PASSED', 'FAILED', 'PARTIALLY_PASSED', 'DISPUTED'))
);

CREATE INDEX IF NOT EXISTS "idx_return_inspections_return_order" ON "return_inspections"("return_order_id");
CREATE INDEX IF NOT EXISTS "idx_return_inspections_inspector" ON "return_inspections"("inspector_id");

-- 2. Create Table: return_inspection_items
CREATE TABLE IF NOT EXISTS "return_inspection_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "inspection_id" UUID NOT NULL,
    "return_item_id" UUID NOT NULL,
    "passed_quantity" INTEGER NOT NULL DEFAULT 0,
    "failed_quantity" INTEGER NOT NULL DEFAULT 0,
    "is_seal_intact" BOOLEAN NOT NULL DEFAULT true,
    "remaining_percentage" INTEGER NOT NULL DEFAULT 100,
    "disposition" VARCHAR(30),
    "reason_detail" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "return_inspection_items_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "fk_inspection_items_inspection" FOREIGN KEY ("inspection_id") REFERENCES "return_inspections"("id") ON DELETE CASCADE,
    CONSTRAINT "fk_inspection_items_return_item" FOREIGN KEY ("return_item_id") REFERENCES "return_order_items"("id") ON DELETE CASCADE,
    CONSTRAINT "chk_inspection_item_quantities" CHECK ("passed_quantity" >= 0 AND "failed_quantity" >= 0 AND ("passed_quantity" + "failed_quantity") > 0),
    CONSTRAINT "chk_inspection_item_remaining_pct" CHECK ("remaining_percentage" >= 0 AND "remaining_percentage" <= 100),
    CONSTRAINT "chk_inspection_item_disposition" CHECK ("disposition" IS NULL OR "disposition" IN ('RESTOCK', 'QUARANTINE', 'SCRAP', 'RETURN_TO_CUSTOMER'))
);

CREATE INDEX IF NOT EXISTS "idx_inspection_items_inspection" ON "return_inspection_items"("inspection_id");
CREATE INDEX IF NOT EXISTS "idx_inspection_items_return_item" ON "return_inspection_items"("return_item_id");

-- 3. Create Table: inventory_dispositions
CREATE TABLE IF NOT EXISTS "inventory_dispositions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "disposition_code" VARCHAR(60) NOT NULL,
    "location_id" UUID NOT NULL,
    "product_variant_id" UUID NOT NULL,
    "lot_id" UUID,
    "return_item_id" UUID,
    "disposition_type" VARCHAR(30) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "executed_by" UUID,
    "executed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    CONSTRAINT "inventory_dispositions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "inventory_dispositions_disposition_code_key" UNIQUE ("disposition_code"),
    CONSTRAINT "fk_disposition_location" FOREIGN KEY ("location_id") REFERENCES "stores"("id") ON DELETE RESTRICT,
    CONSTRAINT "fk_disposition_variant" FOREIGN KEY ("product_variant_id") REFERENCES "product_variants"("id") ON DELETE RESTRICT,
    CONSTRAINT "fk_disposition_lot" FOREIGN KEY ("lot_id") REFERENCES "inventory_lots"("id") ON DELETE SET NULL,
    CONSTRAINT "fk_disposition_return_item" FOREIGN KEY ("return_item_id") REFERENCES "return_order_items"("id") ON DELETE SET NULL,
    CONSTRAINT "fk_disposition_executor" FOREIGN KEY ("executed_by") REFERENCES "users"("id") ON DELETE SET NULL,
    CONSTRAINT "chk_disposition_quantity_positive" CHECK ("quantity" > 0),
    CONSTRAINT "chk_disposition_type" CHECK ("disposition_type" IN ('RESTOCK', 'QUARANTINE', 'SCRAP', 'RETURN_TO_CUSTOMER'))
);

CREATE INDEX IF NOT EXISTS "idx_disposition_location" ON "inventory_dispositions"("location_id");
CREATE INDEX IF NOT EXISTS "idx_disposition_variant" ON "inventory_dispositions"("product_variant_id");
CREATE INDEX IF NOT EXISTS "idx_disposition_return_item" ON "inventory_dispositions"("return_item_id");
