-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "claim_token" UUID,
ADD COLUMN     "expires_at" TIMESTAMPTZ,
ADD COLUMN     "first_paid_received_at" TIMESTAMPTZ,
ADD COLUMN     "gateway_reported_status" VARCHAR(20),
ADD COLUMN     "lease_until" TIMESTAMPTZ,
ADD COLUMN     "merchant_reference" VARCHAR(100),
ADD COLUMN     "next_query_at" TIMESTAMPTZ,
ADD COLUMN     "payment_url" TEXT,
ADD COLUMN     "platform" VARCHAR(10),
ADD COLUMN     "qr_code_data" TEXT,
ADD COLUMN     "recovery_until" TIMESTAMPTZ,
ADD COLUMN     "request_id" VARCHAR(50),
ADD COLUMN     "request_snapshot" JSONB,
ADD COLUMN     "return_state" VARCHAR(64),
ADD COLUMN     "return_state_expires_at" TIMESTAMPTZ,
ADD COLUMN     "return_url" TEXT,
ADD COLUMN     "verification_pending" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "wallet_deeplink" TEXT;

-- AlterTable
ALTER TABLE "refunds" ADD COLUMN     "compensation_key" VARCHAR(160);

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "event_key" VARCHAR(160);

-- CreateTable
CREATE TABLE "payment_webhook_inbox" (
    "id" UUID NOT NULL,
    "payment_id" UUID NOT NULL,
    "event_key" VARCHAR(64) NOT NULL,
    "payload_hash" VARCHAR(64) NOT NULL,
    "payload" JSONB NOT NULL,
    "transaction_id" VARCHAR(100) NOT NULL,
    "reported_status" VARCHAR(20) NOT NULL,
    "received_at" TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    "processed_at" TIMESTAMPTZ,

    CONSTRAINT "payment_webhook_inbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_charges" (
    "id" UUID NOT NULL,
    "payment_id" UUID NOT NULL,
    "gateway" VARCHAR(20) NOT NULL,
    "transaction_id" VARCHAR(100) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "first_paid_received_at" TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    "verified_at" TIMESTAMPTZ,
    "fulfilled" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "payment_charges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_outbox" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "event_key" VARCHAR(160) NOT NULL,
    "recipient" VARCHAR(255) NOT NULL,
    "subject" VARCHAR(255) NOT NULL,
    "text" TEXT NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "next_attempt_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lease_until" TIMESTAMPTZ,
    "claim_token" UUID,
    "last_error" VARCHAR(100),
    "sent_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_outbox_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payment_webhook_inbox_event_key_key" ON "payment_webhook_inbox"("event_key");

-- CreateIndex
CREATE INDEX "payment_webhook_inbox_payment_id_processed_at_idx" ON "payment_webhook_inbox"("payment_id", "processed_at");

-- CreateIndex
CREATE INDEX "payment_charges_payment_id_idx" ON "payment_charges"("payment_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_charges_gateway_transaction_id_key" ON "payment_charges"("gateway", "transaction_id");

-- CreateIndex
CREATE UNIQUE INDEX "email_outbox_event_key_key" ON "email_outbox"("event_key");

-- CreateIndex
CREATE INDEX "email_outbox_status_next_attempt_at_lease_until_idx" ON "email_outbox"("status", "next_attempt_at", "lease_until");

-- CreateIndex
CREATE UNIQUE INDEX "payments_merchant_reference_key" ON "payments"("merchant_reference");

-- CreateIndex
CREATE UNIQUE INDEX "payments_return_state_key" ON "payments"("return_state");

-- CreateIndex
CREATE INDEX "payments_next_query_at_lease_until_idx" ON "payments"("next_query_at", "lease_until");

-- CreateIndex
CREATE INDEX "payments_order_id_created_at_idx" ON "payments"("order_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "refunds_compensation_key_key" ON "refunds"("compensation_key");

-- CreateIndex
CREATE UNIQUE INDEX "notifications_event_key_key" ON "notifications"("event_key");

-- CreateIndex
CREATE INDEX "notifications_user_id_is_read_created_at_idx" ON "notifications"("user_id", "is_read", "created_at");

-- AddForeignKey
ALTER TABLE "payment_webhook_inbox" ADD CONSTRAINT "payment_webhook_inbox_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_charges" ADD CONSTRAINT "payment_charges_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_outbox" ADD CONSTRAINT "email_outbox_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
