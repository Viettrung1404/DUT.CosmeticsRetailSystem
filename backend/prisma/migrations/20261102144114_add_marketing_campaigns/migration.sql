-- CreateTable
CREATE TABLE "marketing_campaigns" (
    "id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "channel" VARCHAR(10) NOT NULL,
    "audience_type" VARCHAR(20) NOT NULL,
    "audience_value" JSONB,
    "title" VARCHAR(255) NOT NULL,
    "content" TEXT NOT NULL,
    "route" VARCHAR(30),
    "resource_id" UUID,
    "status" VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    "scheduled_at" TIMESTAMPTZ,
    "sent_at" TIMESTAMPTZ,
    "recipient_count" INTEGER NOT NULL DEFAULT 0,
    "send_version" INTEGER NOT NULL DEFAULT 0,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marketing_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "marketing_campaigns_status_scheduled_at_idx" ON "marketing_campaigns"("status", "scheduled_at");

-- CreateIndex
CREATE INDEX "marketing_campaigns_created_at_idx" ON "marketing_campaigns"("created_at");

-- CreateCheck
ALTER TABLE "marketing_campaigns"
  ADD CONSTRAINT "marketing_campaigns_channel_check" CHECK ("channel" IN ('PUSH', 'EMAIL')),
  ADD CONSTRAINT "marketing_campaigns_audience_type_check" CHECK ("audience_type" IN ('ALL', 'TIER', 'CUSTOMERS')),
  ADD CONSTRAINT "marketing_campaigns_status_check" CHECK ("status" IN ('DRAFT', 'SCHEDULED', 'SENDING', 'SENT', 'CANCELLED')),
  ADD CONSTRAINT "marketing_campaigns_route_check" CHECK ("route" IS NULL OR "route" IN ('PRODUCT', 'PROMOTION', 'BLOG')),
  ADD CONSTRAINT "marketing_campaigns_push_target_check" CHECK ("channel" <> 'PUSH' OR ("route" IS NOT NULL AND "resource_id" IS NOT NULL)),
  ADD CONSTRAINT "marketing_campaigns_scheduled_check" CHECK ("status" <> 'SCHEDULED' OR "scheduled_at" IS NOT NULL),
  ADD CONSTRAINT "marketing_campaigns_recipient_count_check" CHECK ("recipient_count" >= 0);
