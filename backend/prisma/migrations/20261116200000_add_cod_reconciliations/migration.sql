-- CreateTable cod_reconciliations
CREATE TABLE IF NOT EXISTS "cod_reconciliations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "reconciliation_code" VARCHAR(60) NOT NULL,
    "carrier_code" VARCHAR(50) NOT NULL,
    "reconciliation_date" DATE NOT NULL,
    "total_cod_declared" DECIMAL(14,2) NOT NULL,
    "total_cod_received" DECIMAL(14,2) NOT NULL,
    "difference_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "status" VARCHAR(30) NOT NULL,
    "bank_statement_ref" VARCHAR(100),
    "approved_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cod_reconciliations_pkey" PRIMARY KEY ("id")
);

-- CreateTable cod_reconciliation_items
CREATE TABLE IF NOT EXISTS "cod_reconciliation_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "reconciliation_id" UUID NOT NULL,
    "shipment_id" UUID NOT NULL,
    "declared_cod_amount" DECIMAL(12,2) NOT NULL,
    "carrier_paid_cod_amount" DECIMAL(12,2) NOT NULL,
    "discrepancy_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "carrier_fee_charged" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" VARCHAR(30) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cod_reconciliation_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "cod_reconciliations_reconciliation_code_key" ON "cod_reconciliations"("reconciliation_code");
CREATE INDEX IF NOT EXISTS "idx_cod_reconciliations_carrier_date" ON "cod_reconciliations"("carrier_code", "reconciliation_date");
CREATE INDEX IF NOT EXISTS "idx_cod_rec_items_reconciliation" ON "cod_reconciliation_items"("reconciliation_id");
CREATE INDEX IF NOT EXISTS "idx_cod_rec_items_shipment" ON "cod_reconciliation_items"("shipment_id");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'cod_reconciliation_items_reconciliation_id_fkey'
    ) THEN
        ALTER TABLE "cod_reconciliation_items" ADD CONSTRAINT "cod_reconciliation_items_reconciliation_id_fkey" 
        FOREIGN KEY ("reconciliation_id") REFERENCES "cod_reconciliations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'cod_reconciliation_items_shipment_id_fkey'
    ) THEN
        ALTER TABLE "cod_reconciliation_items" ADD CONSTRAINT "cod_reconciliation_items_shipment_id_fkey" 
        FOREIGN KEY ("shipment_id") REFERENCES "shipments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;
