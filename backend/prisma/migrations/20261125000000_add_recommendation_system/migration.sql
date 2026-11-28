-- CreateEnum
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BehaviorEventType') THEN
        CREATE TYPE "BehaviorEventType" AS ENUM (
            'VIEW_PRODUCT',
            'SEARCH_QUERY',
            'SEARCH_CLICK',
            'ADD_TO_WISHLIST',
            'ADD_TO_CART',
            'TRY_ON_COLOR',
            'PURCHASE'
        );
    END IF;
END $$;

-- CreateEnum
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RecommendationType') THEN
        CREATE TYPE "RecommendationType" AS ENUM (
            'SIMILAR_CONTENT',
            'BOUGHT_TOGETHER',
            'ROUTINE_COMPLEMENT'
        );
    END IF;
END $$;

-- CreateEnum
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RecommendationPlacement') THEN
        CREATE TYPE "RecommendationPlacement" AS ENUM (
            'HOME',
            'PRODUCT_SIMILAR',
            'PRODUCT_BOUGHT_TOGETHER',
            'CART_ROUTINE'
        );
    END IF;
END $$;

-- AlterTable
ALTER TABLE "cart_items"
    ADD COLUMN IF NOT EXISTS "attribution_source" VARCHAR(60);

-- AlterTable
ALTER TABLE "order_items"
    ADD COLUMN IF NOT EXISTS "attribution_source" VARCHAR(60);

-- CreateTable
CREATE TABLE IF NOT EXISTS "user_behavior_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "customer_id" UUID,
    "anonymous_id" VARCHAR(64) NOT NULL,
    "event_type" "BehaviorEventType" NOT NULL,
    "product_id" UUID,
    "variant_id" UUID,
    "category_id" UUID,
    "brand_id" UUID,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "source" VARCHAR(60),
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_behavior_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "product_recommendations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "source_product_id" UUID NOT NULL,
    "target_product_id" UUID NOT NULL,
    "type" "RecommendationType" NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "reason" VARCHAR(255),
    "batch_version" VARCHAR(64) NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "user_affinity_profiles" (
    "customer_id" UUID NOT NULL,
    "top_categories" JSONB NOT NULL,
    "top_brands" JSONB NOT NULL,
    "preferred_tags" JSONB NOT NULL,
    "avoided_tags" JSONB,
    "avg_price_range" JSONB,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_affinity_profiles_pkey" PRIMARY KEY ("customer_id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "recommendation_daily_metrics" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "metric_date" DATE NOT NULL,
    "placement" "RecommendationPlacement" NOT NULL,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "add_to_carts" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "revenue" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recommendation_daily_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_ube_customer_created"
    ON "user_behavior_events"("customer_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_ube_anonymous_created"
    ON "user_behavior_events"("anonymous_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_ube_product_event_created"
    ON "user_behavior_events"("product_id", "event_type", "created_at" DESC);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_ube_created_at"
    ON "user_behavior_events"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "uq_product_rec_source_target_type"
    ON "product_recommendations"("source_product_id", "target_product_id", "type");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_product_rec_lookup"
    ON "product_recommendations"("source_product_id", "type", "score" DESC);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_product_rec_batch_cleanup"
    ON "product_recommendations"("type", "batch_version");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_product_rec_target"
    ON "product_recommendations"("target_product_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "uq_rec_daily_metric_date_placement"
    ON "recommendation_daily_metrics"("metric_date", "placement");

-- AddForeignKey
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'product_recommendations_source_product_id_fkey'
    ) THEN
        ALTER TABLE "product_recommendations"
            ADD CONSTRAINT "product_recommendations_source_product_id_fkey"
            FOREIGN KEY ("source_product_id") REFERENCES "products"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'product_recommendations_target_product_id_fkey'
    ) THEN
        ALTER TABLE "product_recommendations"
            ADD CONSTRAINT "product_recommendations_target_product_id_fkey"
            FOREIGN KEY ("target_product_id") REFERENCES "products"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
