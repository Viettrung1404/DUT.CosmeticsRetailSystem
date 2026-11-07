-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "pricing_snapshot" JSONB;

-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "pricing_snapshot" JSONB;

-- AlterTable
ALTER TABLE "return_orders" ADD COLUMN     "quote_expires_at" TIMESTAMPTZ,
ADD COLUMN     "quote_snapshot" JSONB,
ADD COLUMN     "quote_version" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "return_order_items" ADD COLUMN     "points_to_restore" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "refund_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ALTER COLUMN "condition" DROP NOT NULL;

-- AlterTable
ALTER TABLE "refunds" ADD COLUMN     "event_key" VARCHAR(160);

-- AlterTable
ALTER TABLE "loyalty_points_transactions" ADD COLUMN     "event_key" VARCHAR(160);

-- Notification event keys and email_outbox are owned by the Sprint 3 migration.
-- Reuse its indexes and cascading user foreign key instead of recreating them.

-- CreateTable
CREATE TABLE "command_receipts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "operation" VARCHAR(60) NOT NULL,
    "idempotency_key" VARCHAR(128) NOT NULL,
    "request_hash" VARCHAR(64) NOT NULL,
    "result" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "command_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "return_attachments" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "return_order_id" UUID,
    "object_key" TEXT NOT NULL,
    "mime_type" VARCHAR(50) NOT NULL,
    "size" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "return_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "return_status_history" (
    "id" UUID NOT NULL,
    "return_order_id" UUID NOT NULL,
    "status" VARCHAR(30) NOT NULL,
    "changed_by" UUID NOT NULL,
    "note" VARCHAR(500),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "return_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exchange_items" (
    "id" UUID NOT NULL,
    "return_order_id" UUID NOT NULL,
    "product_variant_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "exchange_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exchange_settlements" (
    "id" UUID NOT NULL,
    "return_order_id" UUID NOT NULL,
    "replacement_order_id" UUID NOT NULL,
    "return_credit" DECIMAL(12,2) NOT NULL,
    "replacement_payable" DECIMAL(12,2) NOT NULL,
    "credit_applied" DECIMAL(12,2) NOT NULL,
    "additional_due" DECIMAL(12,2) NOT NULL,
    "refund_due" DECIMAL(12,2) NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exchange_settlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipment_events" (
    "id" UUID NOT NULL,
    "shipment_id" UUID NOT NULL,
    "carrier_code" VARCHAR(50) NOT NULL,
    "event_id" VARCHAR(160) NOT NULL,
    "status" VARCHAR(30) NOT NULL,
    "occurred_at" TIMESTAMPTZ NOT NULL,
    "received_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shipment_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loyalty_redemptions" (
    "id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "coupon_id" UUID NOT NULL,
    "reward_code" VARCHAR(60) NOT NULL,
    "reward_snapshot" JSONB NOT NULL,
    "points_cost" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "loyalty_redemptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "push_deliveries" (
    "id" UUID NOT NULL,
    "notification_id" UUID NOT NULL,
    "device_id" UUID NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "next_attempt_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lease_until" TIMESTAMPTZ,
    "claim_token" UUID,
    "last_error" VARCHAR(100),
    "sent_at" TIMESTAMPTZ,

    CONSTRAINT "push_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "command_receipts_user_id_operation_idempotency_key_key" ON "command_receipts"("user_id", "operation", "idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "return_attachments_object_key_key" ON "return_attachments"("object_key");

-- CreateIndex
CREATE INDEX "return_attachments_user_id_return_order_id_created_at_idx" ON "return_attachments"("user_id", "return_order_id", "created_at");

-- CreateIndex
CREATE INDEX "return_status_history_return_order_id_created_at_id_idx" ON "return_status_history"("return_order_id", "created_at", "id");

-- CreateIndex
CREATE UNIQUE INDEX "exchange_items_return_order_id_product_variant_id_key" ON "exchange_items"("return_order_id", "product_variant_id");

-- CreateIndex
CREATE UNIQUE INDEX "exchange_settlements_return_order_id_key" ON "exchange_settlements"("return_order_id");

-- CreateIndex
CREATE UNIQUE INDEX "exchange_settlements_replacement_order_id_key" ON "exchange_settlements"("replacement_order_id");

-- CreateIndex
CREATE INDEX "shipment_events_shipment_id_occurred_at_id_idx" ON "shipment_events"("shipment_id", "occurred_at", "id");

-- CreateIndex
CREATE UNIQUE INDEX "shipment_events_carrier_code_event_id_key" ON "shipment_events"("carrier_code", "event_id");

-- CreateIndex
CREATE UNIQUE INDEX "loyalty_redemptions_coupon_id_key" ON "loyalty_redemptions"("coupon_id");

-- CreateIndex
CREATE INDEX "loyalty_redemptions_customer_id_created_at_id_idx" ON "loyalty_redemptions"("customer_id", "created_at", "id");

-- CreateIndex
CREATE INDEX "push_deliveries_status_next_attempt_at_lease_until_idx" ON "push_deliveries"("status", "next_attempt_at", "lease_until");

-- CreateIndex
CREATE UNIQUE INDEX "push_deliveries_notification_id_device_id_key" ON "push_deliveries"("notification_id", "device_id");

-- CreateIndex
CREATE INDEX "order_status_history_order_id_status_created_at_idx" ON "order_status_history"("order_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "return_orders_customer_id_created_at_id_idx" ON "return_orders"("customer_id", "created_at", "id");

-- CreateIndex
CREATE INDEX "return_order_items_order_item_id_idx" ON "return_order_items"("order_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "return_order_items_return_order_id_order_item_id_key" ON "return_order_items"("return_order_id", "order_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "refunds_event_key_key" ON "refunds"("event_key");

-- CreateIndex
CREATE INDEX "refunds_return_order_id_status_idx" ON "refunds"("return_order_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "loyalty_points_transactions_event_key_key" ON "loyalty_points_transactions"("event_key");

-- CreateIndex
CREATE INDEX "loyalty_points_transactions_customer_id_created_at_id_idx" ON "loyalty_points_transactions"("customer_id", "created_at", "id");

-- CreateIndex
CREATE INDEX "wishlists_customer_id_created_at_id_idx" ON "wishlists"("customer_id", "created_at", "id");

-- AddForeignKey
ALTER TABLE "command_receipts" ADD CONSTRAINT "command_receipts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_attachments" ADD CONSTRAINT "return_attachments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_attachments" ADD CONSTRAINT "return_attachments_return_order_id_fkey" FOREIGN KEY ("return_order_id") REFERENCES "return_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_status_history" ADD CONSTRAINT "return_status_history_return_order_id_fkey" FOREIGN KEY ("return_order_id") REFERENCES "return_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exchange_items" ADD CONSTRAINT "exchange_items_return_order_id_fkey" FOREIGN KEY ("return_order_id") REFERENCES "return_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exchange_items" ADD CONSTRAINT "exchange_items_product_variant_id_fkey" FOREIGN KEY ("product_variant_id") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exchange_settlements" ADD CONSTRAINT "exchange_settlements_return_order_id_fkey" FOREIGN KEY ("return_order_id") REFERENCES "return_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exchange_settlements" ADD CONSTRAINT "exchange_settlements_replacement_order_id_fkey" FOREIGN KEY ("replacement_order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_events" ADD CONSTRAINT "shipment_events_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "shipments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loyalty_redemptions" ADD CONSTRAINT "loyalty_redemptions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loyalty_redemptions" ADD CONSTRAINT "loyalty_redemptions_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "coupons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "push_deliveries" ADD CONSTRAINT "push_deliveries_notification_id_fkey" FOREIGN KEY ("notification_id") REFERENCES "notifications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "push_deliveries" ADD CONSTRAINT "push_deliveries_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "user_devices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Explicit SQL invariants that Prisma cannot express.
ALTER TABLE return_order_items ADD COLUMN points_value DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (points_value >= 0);
CREATE SEQUENCE "customer_order_seq";
SELECT setval('customer_order_seq', GREATEST((SELECT count(*) FROM orders),
  COALESCE((SELECT max(substring(order_number FROM 12)::bigint) FROM orders WHERE order_number ~ '^ORD[0-9]{12,18}$'),0), 1));
ALTER TABLE return_order_items ADD CONSTRAINT chk_return_refund_nonnegative CHECK (refund_amount >= 0 AND points_to_restore >= 0);
ALTER TABLE return_order_items ADD CONSTRAINT chk_return_condition CHECK (condition IS NULL OR condition IN ('RESALEABLE','DAMAGED'));
ALTER TABLE exchange_items ADD CONSTRAINT chk_exchange_quantity_positive CHECK (quantity > 0);
ALTER TABLE exchange_settlements ADD CONSTRAINT chk_exchange_amounts CHECK (
  return_credit >= 0 AND replacement_payable >= 0 AND credit_applied >= 0 AND additional_due >= 0 AND refund_due >= 0
  AND credit_applied + additional_due = replacement_payable
  AND credit_applied + refund_due = return_credit
  AND (additional_due = 0 OR refund_due = 0));
ALTER TABLE loyalty_redemptions ADD CONSTRAINT chk_redemption_points_positive CHECK (points_cost > 0);
ALTER TABLE return_attachments ADD CONSTRAINT chk_attachment_size CHECK (size > 0 AND size <= 5242880);
ALTER TABLE return_status_history ADD CONSTRAINT return_history_actor_fkey FOREIGN KEY (changed_by) REFERENCES users(id);
-- Existing rows retain NULL snapshots and require explicit historical pricing review.
-- Never fabricate historical coupon/points allocations or emit historical notifications.
INSERT INTO customers (id,user_id,full_name,updated_at)
SELECT gen_random_uuid(),u.id,u.full_name,now() FROM users u
WHERE u.role_id=6 AND NOT EXISTS (SELECT 1 FROM customers c WHERE c.user_id=u.id);
-- No phone-based merge: a verified identity workflow must explicitly authorize it.
ALTER TABLE return_status_history ADD COLUMN event_key VARCHAR(200) UNIQUE;
CREATE TABLE exchange_funding (
  id UUID PRIMARY KEY,
  settlement_id UUID NOT NULL REFERENCES exchange_settlements(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  source_order_id UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  UNIQUE(settlement_id,payment_id)
);
CREATE INDEX exchange_funding_source_order_id_payment_id_idx ON exchange_funding(source_order_id,payment_id);

