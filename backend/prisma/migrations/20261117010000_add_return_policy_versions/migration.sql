-- =============================================================================
-- Migration: 20261117010000_add_return_policy_versions
-- Epic 13: Policy Versioning & RMA Claims Engine (EP13-T01)
-- =============================================================================

-- 1. Create Table: return_policy_versions
CREATE TABLE IF NOT EXISTS "return_policy_versions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "version_name" VARCHAR(50) NOT NULL,
    "effective_from" TIMESTAMPTZ NOT NULL,
    "effective_to" TIMESTAMPTZ,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "return_policy_versions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "uq_return_policy_version_name" UNIQUE ("version_name")
);

-- 2. Create Table: return_policy_rules
CREATE TABLE IF NOT EXISTS "return_policy_rules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "policy_version_id" UUID NOT NULL,
    "reason_code" VARCHAR(50) NOT NULL,
    "category_id" UUID,
    "window_days" INTEGER NOT NULL,
    "requires_original_seal" BOOLEAN NOT NULL DEFAULT true,
    "max_usage_percentage" INTEGER NOT NULL DEFAULT 0,
    "shipping_fee_bearer" VARCHAR(30) NOT NULL DEFAULT 'CUSTOMER',
    "requires_evidence_video" BOOLEAN NOT NULL DEFAULT false,
    "requires_evidence_image" BOOLEAN NOT NULL DEFAULT true,
    "allow_store_dropoff" BOOLEAN NOT NULL DEFAULT true,
    "allow_carrier_pickup" BOOLEAN NOT NULL DEFAULT true,
    "requires_manual_review" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "return_policy_rules_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "fk_policy_rule_version" FOREIGN KEY ("policy_version_id") REFERENCES "return_policy_versions"("id") ON DELETE CASCADE,
    CONSTRAINT "fk_policy_rule_category" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL,
    CONSTRAINT "chk_policy_window_days_positive" CHECK ("window_days" > 0),
    CONSTRAINT "chk_policy_usage_percentage_range" CHECK ("max_usage_percentage" >= 0 AND "max_usage_percentage" <= 100),
    CONSTRAINT "chk_policy_shipping_fee_bearer" CHECK ("shipping_fee_bearer" IN ('CUSTOMER', 'GLOWUP'))
);

CREATE INDEX IF NOT EXISTS "idx_return_policy_rules_version_reason" ON "return_policy_rules"("policy_version_id", "reason_code");

-- 3. Alter Table: orders (add policy_version_id)
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "policy_version_id" UUID;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_orders_policy_version') THEN
    ALTER TABLE "orders" ADD CONSTRAINT "fk_orders_policy_version" FOREIGN KEY ("policy_version_id") REFERENCES "return_policy_versions"("id") ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "idx_orders_policy_version" ON "orders"("policy_version_id");

-- 4. Alter Table: return_orders (expand fields for P1 RMA)
ALTER TABLE "return_orders" ADD COLUMN IF NOT EXISTS "policy_version_id" UUID;
ALTER TABLE "return_orders" ADD COLUMN IF NOT EXISTS "dropoff_location_id" UUID;
ALTER TABLE "return_orders" ADD COLUMN IF NOT EXISTS "pickup_address" JSONB;
ALTER TABLE "return_orders" ADD COLUMN IF NOT EXISTS "return_channel" VARCHAR(30) NOT NULL DEFAULT 'STORE_DROPOFF';
ALTER TABLE "return_orders" ADD COLUMN IF NOT EXISTS "total_refund_approved" DECIMAL(12, 2) NOT NULL DEFAULT 0;
ALTER TABLE "return_orders" ADD COLUMN IF NOT EXISTS "customer_note" TEXT;
ALTER TABLE "return_orders" ADD COLUMN IF NOT EXISTS "rejection_reason" TEXT;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_return_orders_policy_version') THEN
    ALTER TABLE "return_orders" ADD CONSTRAINT "fk_return_orders_policy_version" FOREIGN KEY ("policy_version_id") REFERENCES "return_policy_versions"("id") ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_return_orders_dropoff_store') THEN
    ALTER TABLE "return_orders" ADD CONSTRAINT "fk_return_orders_dropoff_store" FOREIGN KEY ("dropoff_location_id") REFERENCES "stores"("id") ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_return_channel') THEN
    ALTER TABLE "return_orders" ADD CONSTRAINT "chk_return_channel" CHECK ("return_channel" IN ('STORE_DROPOFF', 'CARRIER_PICKUP'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_return_total_refund_approved_non_negative') THEN
    ALTER TABLE "return_orders" ADD CONSTRAINT "chk_return_total_refund_approved_non_negative" CHECK ("total_refund_approved" >= 0);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "idx_return_orders_policy_version" ON "return_orders"("policy_version_id");
CREATE INDEX IF NOT EXISTS "idx_return_orders_dropoff_location" ON "return_orders"("dropoff_location_id");

-- 5. Alter Table: return_order_items (expand fields for reason, inspection & disposition)
ALTER TABLE "return_order_items" ADD COLUMN IF NOT EXISTS "reason_code" VARCHAR(50) NOT NULL DEFAULT 'CHANGE_OF_MIND';
ALTER TABLE "return_order_items" ADD COLUMN IF NOT EXISTS "customer_note" TEXT;
ALTER TABLE "return_order_items" ADD COLUMN IF NOT EXISTS "refund_amount_per_unit" DECIMAL(12, 2) NOT NULL DEFAULT 0;
ALTER TABLE "return_order_items" ADD COLUMN IF NOT EXISTS "inspection_status" VARCHAR(30) NOT NULL DEFAULT 'PENDING';
ALTER TABLE "return_order_items" ADD COLUMN IF NOT EXISTS "disposition" VARCHAR(30);
ALTER TABLE "return_order_items" ADD COLUMN IF NOT EXISTS "evidence_images" JSONB;
ALTER TABLE "return_order_items" ADD COLUMN IF NOT EXISTS "evidence_video_url" TEXT;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_return_item_inspection_status') THEN
    ALTER TABLE "return_order_items" ADD CONSTRAINT "chk_return_item_inspection_status" CHECK ("inspection_status" IN ('PENDING', 'PASSED', 'FAILED', 'DISPUTED'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_return_item_disposition') THEN
    ALTER TABLE "return_order_items" ADD CONSTRAINT "chk_return_item_disposition" CHECK ("disposition" IS NULL OR "disposition" IN ('RESTOCK', 'QUARANTINE', 'SCRAP', 'RETURN_TO_CUSTOMER'));
  END IF;
END $$;
