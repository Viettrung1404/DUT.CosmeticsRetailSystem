-- CreateTable: shipment_attempts
CREATE TABLE IF NOT EXISTS "shipment_attempts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "shipment_id" UUID NOT NULL,
    "attempt_number" INT NOT NULL,
    "attempted_at" TIMESTAMPTZ NOT NULL,
    "failure_reason_code" VARCHAR(50),
    "failure_reason_detail" TEXT,
    "carrier_raw_status" VARCHAR(50),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shipment_attempts_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "uq_shipment_attempt" UNIQUE ("shipment_id", "attempt_number"),
    CONSTRAINT "fk_shipment_attempts_shipment" FOREIGN KEY ("shipment_id") REFERENCES "shipments"("id") ON DELETE CASCADE
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_shipment_attempts_shipment" ON "shipment_attempts"("shipment_id", "attempted_at");
