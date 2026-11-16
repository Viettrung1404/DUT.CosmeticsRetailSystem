-- CreateTable: shipping_webhook_inbox
CREATE TABLE IF NOT EXISTS "shipping_webhook_inbox" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "carrier_code" VARCHAR(50) NOT NULL,
    "event_id" VARCHAR(150) NOT NULL,
    "event_type" VARCHAR(80),
    "tracking_code" VARCHAR(100),
    "payload" JSONB NOT NULL,
    "processed_status" VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    "error_message" TEXT,
    "received_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMPTZ,

    CONSTRAINT "shipping_webhook_inbox_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "uq_webhook_carrier_event" UNIQUE ("carrier_code", "event_id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_webhook_inbox_status_received" ON "shipping_webhook_inbox"("processed_status", "received_at");
CREATE INDEX IF NOT EXISTS "idx_webhook_inbox_tracking" ON "shipping_webhook_inbox"("tracking_code");
