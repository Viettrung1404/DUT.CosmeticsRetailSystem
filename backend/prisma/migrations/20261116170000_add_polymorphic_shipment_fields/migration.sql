-- AlterTable shipments for polymorphic shipping abstraction
ALTER TABLE "shipments" ADD COLUMN IF NOT EXISTS "actual_shipping_fee" DECIMAL(12,2) DEFAULT 0;
ALTER TABLE "shipments" ADD COLUMN IF NOT EXISTS "carrier_reference_id" VARCHAR(100);
ALTER TABLE "shipments" ADD COLUMN IF NOT EXISTS "cod_status" VARCHAR(30) DEFAULT 'COD_EXPECTED';
ALTER TABLE "shipments" ADD COLUMN IF NOT EXISTS "return_order_id" UUID;
ALTER TABLE "shipments" ADD COLUMN IF NOT EXISTS "shipment_type" VARCHAR(30) NOT NULL DEFAULT 'OUTBOUND';
ALTER TABLE "shipments" ADD COLUMN IF NOT EXISTS "tracking_url" TEXT;
ALTER TABLE "shipments" ALTER COLUMN "shipment_code" SET DATA TYPE VARCHAR(60);
ALTER TABLE "shipments" ALTER COLUMN "shipping_fee_paid" SET DEFAULT 0;
ALTER TABLE "shipments" ALTER COLUMN "status" SET DATA TYPE VARCHAR(35);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_shipments_return_order_id" ON "shipments"("return_order_id");
CREATE INDEX IF NOT EXISTS "idx_shipments_carrier_tracking" ON "shipments"("carrier_code", "tracking_code");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'shipments_return_order_id_fkey'
    ) THEN
        ALTER TABLE "shipments" ADD CONSTRAINT "shipments_return_order_id_fkey" 
        FOREIGN KEY ("return_order_id") REFERENCES "return_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- Add polymorphic check constraint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_shipment_type_ref'
    ) THEN
        ALTER TABLE "shipments" ADD CONSTRAINT "chk_shipment_type_ref" CHECK (
            (shipment_type = 'OUTBOUND' AND (fulfillment_order_id IS NOT NULL OR order_id IS NOT NULL)) OR
            (shipment_type = 'RETURN_PICKUP' AND return_order_id IS NOT NULL) OR
            (shipment_type = 'INTER_STORE_TRANSFER')
        );
    END IF;
END $$;
