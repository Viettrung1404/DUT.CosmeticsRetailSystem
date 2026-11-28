-- AlterTable fulfillment_orders: add version column for Optimistic Concurrency Control (OCC)
ALTER TABLE "fulfillment_orders" ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1;

-- CreateTable: domain_status_histories for Universal Audit Log (DES-05 & DES-07 EP11-T03)
CREATE TABLE IF NOT EXISTS "domain_status_histories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" UUID NOT NULL,
    "from_status" VARCHAR(50) NOT NULL,
    "to_status" VARCHAR(50) NOT NULL,
    "action_performed" VARCHAR(80) NOT NULL,
    "actor_type" VARCHAR(30) NOT NULL,
    "actor_id" VARCHAR(100),
    "reason" TEXT,
    "metadata" JSONB,
    "occurred_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "domain_status_histories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_domain_status_audit" ON "domain_status_histories"("entity_type", "entity_id", "occurred_at" DESC);
