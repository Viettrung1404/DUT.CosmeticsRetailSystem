-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "email_opt_out" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "email_outbox" ADD COLUMN     "html" TEXT;

-- CreateTable
CREATE TABLE "marketing_email_events" (
    "id" UUID NOT NULL,
    "campaign_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" VARCHAR(10) NOT NULL,
    "url" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marketing_email_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_templates" (
    "id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "subject" VARCHAR(255) NOT NULL,
    "html" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_tags" (
    "id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "tag" VARCHAR(50) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_tags_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "marketing_email_events_campaign_id_type_idx" ON "marketing_email_events"("campaign_id", "type");

-- CreateIndex
CREATE UNIQUE INDEX "email_templates_name_key" ON "email_templates"("name");

-- CreateIndex
CREATE INDEX "customer_tags_tag_idx" ON "customer_tags"("tag");

-- CreateIndex
CREATE UNIQUE INDEX "customer_tags_customer_id_tag_key" ON "customer_tags"("customer_id", "tag");

-- AddForeignKey
ALTER TABLE "marketing_email_events" ADD CONSTRAINT "marketing_email_events_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "marketing_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_tags" ADD CONSTRAINT "customer_tags_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "marketing_email_events" ADD CONSTRAINT "chk_marketing_email_events_type" CHECK ("type" IN ('OPEN', 'CLICK'));
