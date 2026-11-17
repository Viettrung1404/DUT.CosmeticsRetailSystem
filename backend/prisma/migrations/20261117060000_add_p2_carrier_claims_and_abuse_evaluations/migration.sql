-- AlterTable return_orders
ALTER TABLE "return_orders" ADD COLUMN IF NOT EXISTS "risk_score" INTEGER;
ALTER TABLE "return_orders" ADD COLUMN IF NOT EXISTS "risk_level" VARCHAR(20);
ALTER TABLE "return_orders" ADD COLUMN IF NOT EXISTS "is_fraud_flagged" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "return_orders" ADD COLUMN IF NOT EXISTS "fraud_reason" TEXT;

-- CreateTable carrier_claims
CREATE TABLE IF NOT EXISTS "carrier_claims" (
    "id" UUID NOT NULL,
    "claim_code" VARCHAR(50) NOT NULL,
    "return_order_id" UUID,
    "shipment_id" UUID,
    "carrier_code" VARCHAR(30) NOT NULL,
    "claim_type" VARCHAR(30) NOT NULL,
    "claim_amount" DECIMAL(12,2) NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "carrier_claims_pkey" PRIMARY KEY ("id")
);

-- CreateTable return_abuse_evaluations
CREATE TABLE IF NOT EXISTS "return_abuse_evaluations" (
    "id" UUID NOT NULL,
    "return_order_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "risk_score" INTEGER NOT NULL,
    "risk_level" VARCHAR(20) NOT NULL,
    "is_flagged" BOOLEAN NOT NULL DEFAULT false,
    "factors" JSONB NOT NULL,
    "action_recommended" VARCHAR(50) NOT NULL,
    "evaluated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "return_abuse_evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "carrier_claims_claim_code_key" ON "carrier_claims"("claim_code");
CREATE INDEX IF NOT EXISTS "carrier_claims_return_order_id_idx" ON "carrier_claims"("return_order_id");
CREATE INDEX IF NOT EXISTS "carrier_claims_shipment_id_idx" ON "carrier_claims"("shipment_id");
CREATE INDEX IF NOT EXISTS "carrier_claims_carrier_code_status_idx" ON "carrier_claims"("carrier_code", "status");

CREATE INDEX IF NOT EXISTS "return_abuse_evaluations_return_order_id_idx" ON "return_abuse_evaluations"("return_order_id");
CREATE INDEX IF NOT EXISTS "return_abuse_evaluations_customer_id_idx" ON "return_abuse_evaluations"("customer_id");
CREATE INDEX IF NOT EXISTS "return_abuse_evaluations_risk_level_is_flagged_idx" ON "return_abuse_evaluations"("risk_level", "is_flagged");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'carrier_claims_return_order_id_fkey') THEN
        ALTER TABLE "carrier_claims" ADD CONSTRAINT "carrier_claims_return_order_id_fkey" FOREIGN KEY ("return_order_id") REFERENCES "return_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'carrier_claims_shipment_id_fkey') THEN
        ALTER TABLE "carrier_claims" ADD CONSTRAINT "carrier_claims_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "shipments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'return_abuse_evaluations_return_order_id_fkey') THEN
        ALTER TABLE "return_abuse_evaluations" ADD CONSTRAINT "return_abuse_evaluations_return_order_id_fkey" FOREIGN KEY ("return_order_id") REFERENCES "return_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'return_abuse_evaluations_customer_id_fkey') THEN
        ALTER TABLE "return_abuse_evaluations" ADD CONSTRAINT "return_abuse_evaluations_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
