-- AlterTable fulfillment_orders
ALTER TABLE "fulfillment_orders" ADD COLUMN IF NOT EXISTS "picked_at" TIMESTAMPTZ;

-- AlterTable shipments
ALTER TABLE "shipments" ADD COLUMN IF NOT EXISTS "fulfillment_order_id" UUID;
CREATE INDEX IF NOT EXISTS "idx_shipments_fulfillment_order_id" ON "shipments"("fulfillment_order_id");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'shipments_fulfillment_order_id_fkey'
    ) THEN
        ALTER TABLE "shipments" ADD CONSTRAINT "shipments_fulfillment_order_id_fkey" 
        FOREIGN KEY ("fulfillment_order_id") REFERENCES "fulfillment_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- CreateTable packages
CREATE TABLE IF NOT EXISTS "packages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "fulfillment_order_id" UUID NOT NULL,
    "package_code" VARCHAR(60) NOT NULL,
    "actual_weight_grams" INTEGER NOT NULL,
    "length_cm" INTEGER NOT NULL,
    "width_cm" INTEGER NOT NULL,
    "height_cm" INTEGER NOT NULL,
    "packed_by" UUID,
    "sealed_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "packages_pkey" PRIMARY KEY ("id")
);

-- Unique & Indexes on packages
CREATE UNIQUE INDEX IF NOT EXISTS "packages_package_code_key" ON "packages"("package_code");
CREATE INDEX IF NOT EXISTS "idx_packages_fo_id" ON "packages"("fulfillment_order_id");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'packages_fulfillment_order_id_fkey'
    ) THEN
        ALTER TABLE "packages" ADD CONSTRAINT "packages_fulfillment_order_id_fkey" 
        FOREIGN KEY ("fulfillment_order_id") REFERENCES "fulfillment_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- Check constraints for packages
ALTER TABLE "packages" DROP CONSTRAINT IF EXISTS "chk_package_weight_positive";
ALTER TABLE "packages" ADD CONSTRAINT "chk_package_weight_positive" CHECK ("actual_weight_grams" > 0);

ALTER TABLE "packages" DROP CONSTRAINT IF EXISTS "chk_package_length_positive";
ALTER TABLE "packages" ADD CONSTRAINT "chk_package_length_positive" CHECK ("length_cm" > 0);

ALTER TABLE "packages" DROP CONSTRAINT IF EXISTS "chk_package_width_positive";
ALTER TABLE "packages" ADD CONSTRAINT "chk_package_width_positive" CHECK ("width_cm" > 0);

ALTER TABLE "packages" DROP CONSTRAINT IF EXISTS "chk_package_height_positive";
ALTER TABLE "packages" ADD CONSTRAINT "chk_package_height_positive" CHECK ("height_cm" > 0);

-- CreateTable package_items
CREATE TABLE IF NOT EXISTS "package_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "package_id" UUID NOT NULL,
    "product_variant_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "package_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "idx_package_items_package_id" ON "package_items"("package_id");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'package_items_package_id_fkey'
    ) THEN
        ALTER TABLE "package_items" ADD CONSTRAINT "package_items_package_id_fkey" 
        FOREIGN KEY ("package_id") REFERENCES "packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'package_items_product_variant_id_fkey'
    ) THEN
        ALTER TABLE "package_items" ADD CONSTRAINT "package_items_product_variant_id_fkey" 
        FOREIGN KEY ("product_variant_id") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

ALTER TABLE "package_items" DROP CONSTRAINT IF EXISTS "chk_package_item_quantity_positive";
ALTER TABLE "package_items" ADD CONSTRAINT "chk_package_item_quantity_positive" CHECK ("quantity" > 0);

-- CreateTable shipment_packages
CREATE TABLE IF NOT EXISTS "shipment_packages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "shipment_id" UUID NOT NULL,
    "package_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shipment_packages_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "uq_shipment_package" ON "shipment_packages"("shipment_id", "package_id");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'shipment_packages_shipment_id_fkey'
    ) THEN
        ALTER TABLE "shipment_packages" ADD CONSTRAINT "shipment_packages_shipment_id_fkey" 
        FOREIGN KEY ("shipment_id") REFERENCES "shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'shipment_packages_package_id_fkey'
    ) THEN
        ALTER TABLE "shipment_packages" ADD CONSTRAINT "shipment_packages_package_id_fkey" 
        FOREIGN KEY ("package_id") REFERENCES "packages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;
