BEGIN;
-- Refuse duplicate reviews; keep historical rows for an audited manual resolution.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM reviews GROUP BY customer_id,product_id HAVING count(*)>1) THEN
    RAISE EXCEPTION 'SPRINT5_DUPLICATE_REVIEWS: audit and resolve duplicate customer/product reviews before migration';
  END IF;
END $$;
-- AlterTable
ALTER TABLE "promotions" ADD COLUMN     "is_flash_sale" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "coupons" ADD COLUMN     "max_discount_amount" DECIMAL(12,2);

-- CreateTable
CREATE TABLE "promotion_variant_quotas" (
    "id" UUID NOT NULL,
    "promotion_id" UUID NOT NULL,
    "product_variant_id" UUID NOT NULL,
    "quota" INTEGER NOT NULL,
    "reserved_quantity" INTEGER NOT NULL DEFAULT 0,
    "consumed_quantity" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "promotion_variant_quotas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promotion_allocations" (
    "id" UUID NOT NULL,
    "promotion_id" UUID NOT NULL,
    "quota_id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "order_item_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'RESERVED',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "promotion_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promotion_order_usages" (
    "id" UUID NOT NULL,
    "promotion_id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'RESERVED',

    CONSTRAINT "promotion_order_usages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog_index_jobs" (
    "product_id" UUID NOT NULL,
    "version" BIGINT NOT NULL DEFAULT 1,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "next_attempt_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "catalog_index_jobs_pkey" PRIMARY KEY ("product_id")
);

-- CreateTable
CREATE TABLE "broadcast_sends" (
    "id" UUID NOT NULL,
    "campaign_id" UUID NOT NULL,
    "send_version" INTEGER NOT NULL,
    "payload_hash" VARCHAR(64) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "message" TEXT NOT NULL,
    "route" VARCHAR(30) NOT NULL,
    "resource_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "broadcast_sends_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "broadcast_recipients" (
    "id" UUID NOT NULL,
    "send_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "delivered_at" TIMESTAMPTZ,

    CONSTRAINT "broadcast_recipients_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "promotion_variant_quotas_promotion_id_product_variant_id_key" ON "promotion_variant_quotas"("promotion_id", "product_variant_id");

-- CreateIndex
CREATE INDEX "promotion_allocations_order_id_status_idx" ON "promotion_allocations"("order_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "promotion_allocations_order_item_id_promotion_id_key" ON "promotion_allocations"("order_item_id", "promotion_id");

-- CreateIndex
CREATE INDEX "promotion_order_usages_order_id_status_idx" ON "promotion_order_usages"("order_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "promotion_order_usages_promotion_id_order_id_key" ON "promotion_order_usages"("promotion_id", "order_id");

-- CreateIndex
CREATE INDEX "catalog_index_jobs_next_attempt_at_idx" ON "catalog_index_jobs"("next_attempt_at");

-- CreateIndex
CREATE UNIQUE INDEX "broadcast_sends_campaign_id_send_version_key" ON "broadcast_sends"("campaign_id", "send_version");

-- CreateIndex
CREATE INDEX "broadcast_recipients_delivered_at_id_idx" ON "broadcast_recipients"("delivered_at", "id");

-- CreateIndex
CREATE UNIQUE INDEX "broadcast_recipients_send_id_user_id_key" ON "broadcast_recipients"("send_id", "user_id");

-- CreateIndex
CREATE INDEX "reviews_product_id_is_approved_created_at_id_idx" ON "reviews"("product_id", "is_approved", "created_at", "id");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_customer_id_product_id_key" ON "reviews"("customer_id", "product_id");

-- CreateIndex
CREATE INDEX "coupon_usage_coupon_id_customer_id_idx" ON "coupon_usage"("coupon_id", "customer_id");

-- CreateIndex
CREATE INDEX "blog_posts_status_published_at_id_idx" ON "blog_posts"("status", "published_at", "id");

-- CreateIndex
CREATE INDEX "blog_posts_blog_category_id_status_published_at_id_idx" ON "blog_posts"("blog_category_id", "status", "published_at", "id");

-- CreateIndex
CREATE INDEX "banners_position_is_active_sort_order_idx" ON "banners"("position", "is_active", "sort_order");

-- AddForeignKey
ALTER TABLE "promotion_variant_quotas" ADD CONSTRAINT "promotion_variant_quotas_promotion_id_fkey" FOREIGN KEY ("promotion_id") REFERENCES "promotions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotion_variant_quotas" ADD CONSTRAINT "promotion_variant_quotas_product_variant_id_fkey" FOREIGN KEY ("product_variant_id") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotion_allocations" ADD CONSTRAINT "promotion_allocations_promotion_id_fkey" FOREIGN KEY ("promotion_id") REFERENCES "promotions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotion_allocations" ADD CONSTRAINT "promotion_allocations_quota_id_fkey" FOREIGN KEY ("quota_id") REFERENCES "promotion_variant_quotas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotion_allocations" ADD CONSTRAINT "promotion_allocations_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotion_allocations" ADD CONSTRAINT "promotion_allocations_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotion_order_usages" ADD CONSTRAINT "promotion_order_usages_promotion_id_fkey" FOREIGN KEY ("promotion_id") REFERENCES "promotions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotion_order_usages" ADD CONSTRAINT "promotion_order_usages_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "broadcast_recipients" ADD CONSTRAINT "broadcast_recipients_send_id_fkey" FOREIGN KEY ("send_id") REFERENCES "broadcast_sends"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

UPDATE coupons SET discount_type='FIXED_AMOUNT' WHERE discount_type='FIXED';
UPDATE promotions SET type='FIXED_AMOUNT' WHERE type='FIXED';
-- Rebuild the derived rating cache using approved reviews only; no review is deleted.
UPDATE products p SET avg_rating=COALESCE((SELECT round(avg(rating)::numeric,2) FROM reviews r WHERE r.product_id=p.id AND r.is_approved),0),
  total_reviews=(SELECT count(*) FROM reviews r WHERE r.product_id=p.id AND r.is_approved);
ALTER TABLE promotions ADD CONSTRAINT promotions_discount_contract CHECK
 (type IN ('FIXED_AMOUNT','PERCENTAGE','FREE_SHIPPING') AND value>=0 AND min_order_amount>=0 AND
  (type<>'PERCENTAGE' OR value<=100) AND (max_discount_amount IS NULL OR max_discount_amount>=0) AND end_date>start_date
  AND (applicable_products IS NULL OR jsonb_typeof(applicable_products)='array')
  AND (applicable_categories IS NULL OR jsonb_typeof(applicable_categories)='array'));
ALTER TABLE coupons ADD CONSTRAINT coupons_discount_contract CHECK
 (discount_type IN ('FIXED_AMOUNT','PERCENTAGE') AND discount_value>=0 AND
  (discount_type<>'PERCENTAGE' OR discount_value<=100) AND (max_discount_amount IS NULL OR max_discount_amount>=0));
ALTER TABLE promotion_variant_quotas ADD CONSTRAINT promotion_quota_bounds CHECK
 (quota>=0 AND reserved_quantity>=0 AND consumed_quantity>=0 AND reserved_quantity+consumed_quantity<=quota);
ALTER TABLE promotion_allocations ADD CONSTRAINT promotion_allocation_bounds CHECK
 (quantity>0 AND status IN ('RESERVED','CONSUMED','RELEASED'));
ALTER TABLE promotion_order_usages ADD CONSTRAINT promotion_usage_status CHECK (status IN ('RESERVED','CONSUMED','RELEASED'));

CREATE FUNCTION sprint5_transition_promotions(target_order uuid, target_status text) RETURNS void LANGUAGE plpgsql AS $$
DECLARE allocation record; usage record;
BEGIN
  IF target_status NOT IN ('CONFIRMED','CANCELLED') THEN RETURN; END IF;
  PERFORM p.id FROM promotions p JOIN promotion_order_usages u ON u.promotion_id=p.id
    WHERE u.order_id=target_order ORDER BY p.id FOR UPDATE OF p;
  PERFORM q.id FROM promotion_variant_quotas q JOIN promotion_allocations a ON a.quota_id=q.id
    WHERE a.order_id=target_order ORDER BY q.id FOR UPDATE OF q;
  FOR allocation IN SELECT * FROM promotion_allocations WHERE order_id=target_order AND status<>'RELEASED' ORDER BY id FOR UPDATE LOOP
    IF target_status='CONFIRMED' AND allocation.status='RESERVED' THEN
      UPDATE promotion_variant_quotas SET reserved_quantity=reserved_quantity-allocation.quantity,
        consumed_quantity=consumed_quantity+allocation.quantity WHERE id=allocation.quota_id;
      UPDATE promotion_allocations SET status='CONSUMED',updated_at=now() WHERE id=allocation.id;
    ELSIF target_status='CANCELLED' THEN
      UPDATE promotion_variant_quotas SET
        reserved_quantity=reserved_quantity-CASE WHEN allocation.status='RESERVED' THEN allocation.quantity ELSE 0 END,
        consumed_quantity=consumed_quantity-CASE WHEN allocation.status='CONSUMED' THEN allocation.quantity ELSE 0 END
        WHERE id=allocation.quota_id;
      UPDATE promotion_allocations SET status='RELEASED',updated_at=now() WHERE id=allocation.id;
    END IF;
  END LOOP;
  IF target_status='CANCELLED' THEN
    FOR usage IN SELECT * FROM promotion_order_usages WHERE order_id=target_order AND status<>'RELEASED' ORDER BY promotion_id FOR UPDATE LOOP
      UPDATE promotions SET used_count=used_count-1 WHERE id=usage.promotion_id;
      UPDATE promotion_order_usages SET status='RELEASED' WHERE id=usage.id;
    END LOOP;
  ELSE
    UPDATE promotion_order_usages SET status='CONSUMED' WHERE order_id=target_order AND status='RESERVED';
  END IF;
END $$;
CREATE FUNCTION sprint5_order_status() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status='CANCELLED' AND OLD.status NOT IN ('PENDING','CONFIRMED','PROCESSING') THEN
      RAISE EXCEPTION 'PROMOTION_CANCEL_AFTER_FULFILLMENT_FORBIDDEN';
    END IF;
    PERFORM sprint5_transition_promotions(NEW.id,NEW.status);
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER sprint5_order_promotions BEFORE UPDATE OF status ON orders FOR EACH ROW EXECUTE FUNCTION sprint5_order_status();

-- Durable indexing events survive application restarts and cover every DB writer.
ALTER TABLE catalog_index_jobs ADD COLUMN indexed_version bigint NOT NULL DEFAULT 0,
  ADD COLUMN claim_token uuid, ADD COLUMN lease_until timestamptz;
CREATE FUNCTION sprint5_enqueue_product(target uuid) RETURNS void LANGUAGE sql AS $$
  INSERT INTO catalog_index_jobs(product_id,version,attempts,next_attempt_at,updated_at) VALUES(target,1,0,now(),now())
  ON CONFLICT(product_id) DO UPDATE SET version=catalog_index_jobs.version+1,attempts=0,next_attempt_at=now(),updated_at=now();
$$;
CREATE FUNCTION sprint5_catalog_event() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE target uuid;
BEGIN
  IF TG_TABLE_NAME='products' THEN target=COALESCE(NEW.id,OLD.id);
  ELSE target=COALESCE(NEW.product_id,OLD.product_id); END IF;
  PERFORM sprint5_enqueue_product(target);
  RETURN COALESCE(NEW,OLD);
END $$;
CREATE TRIGGER sprint5_product_index AFTER INSERT OR UPDATE OR DELETE ON products FOR EACH ROW EXECUTE FUNCTION sprint5_catalog_event();
CREATE TRIGGER sprint5_variant_index AFTER INSERT OR UPDATE OR DELETE ON product_variants FOR EACH ROW EXECUTE FUNCTION sprint5_catalog_event();
CREATE TRIGGER sprint5_review_index AFTER INSERT OR UPDATE OR DELETE ON reviews FOR EACH ROW EXECUTE FUNCTION sprint5_catalog_event();
CREATE FUNCTION sprint5_catalog_metadata_event() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE target record;
BEGIN
  FOR target IN SELECT id FROM products ORDER BY id LOOP PERFORM sprint5_enqueue_product(target.id); END LOOP;
  RETURN COALESCE(NEW,OLD);
END $$;
CREATE TRIGGER sprint5_promotion_index AFTER UPDATE OF name,value,type,min_order_amount,max_discount_amount,is_active,start_date,end_date,applicable_products,applicable_categories ON promotions FOR EACH STATEMENT EXECUTE FUNCTION sprint5_catalog_metadata_event();
CREATE TRIGGER sprint5_brand_index AFTER UPDATE OF name,is_active ON brands FOR EACH STATEMENT EXECUTE FUNCTION sprint5_catalog_metadata_event();
CREATE TRIGGER sprint5_category_index AFTER UPDATE OF name,is_active ON categories FOR EACH STATEMENT EXECUTE FUNCTION sprint5_catalog_metadata_event();
INSERT INTO catalog_index_jobs(product_id) SELECT id FROM products;
-- Public price is for one unit, without basket-only conditions; same order-level cap
-- semantics as the application engine for that selection. No coupon or private data.
CREATE FUNCTION sprint5_variant_price(target_variant uuid, tier_percentage numeric) RETURNS numeric LANGUAGE plpgsql STABLE AS $$
DECLARE v record; campaign record; discount numeric; best numeric;
BEGIN
  SELECT pv.price,pv.product_id,p.category_id INTO v FROM product_variants pv JOIN products p ON p.id=pv.product_id WHERE pv.id=target_variant;
  IF NOT FOUND THEN RETURN NULL; END IF;
  best=trunc(v.price*LEAST(100,GREATEST(0,tier_percentage))/100,2);
  FOR campaign IN SELECT p.* FROM promotions p WHERE p.is_active AND p.start_date<=now() AND p.end_date>now()
    AND p.min_order_amount=0 AND (p.usage_limit IS NULL OR p.used_count<p.usage_limit)
    AND p.type IN ('PERCENTAGE','FIXED_AMOUNT')
    AND ((COALESCE(p.applicable_products,'[]'::jsonb)='[]'::jsonb AND COALESCE(p.applicable_categories,'[]'::jsonb)='[]'::jsonb)
      OR p.applicable_products ? v.product_id::text OR p.applicable_categories ? v.category_id::text)
    AND (NOT p.is_flash_sale OR EXISTS(SELECT 1 FROM promotion_variant_quotas q WHERE q.promotion_id=p.id AND q.product_variant_id=target_variant AND q.quota-q.reserved_quantity-q.consumed_quantity>=1))
    ORDER BY p.id LOOP
    discount=CASE WHEN campaign.type='PERCENTAGE' THEN trunc(v.price*campaign.value/100,2) ELSE campaign.value END;
    discount=LEAST(v.price,discount,COALESCE(campaign.max_discount_amount,v.price));
    best=GREATEST(best,discount);
  END LOOP;
  RETURN GREATEST(0,v.price-best);
END $$;
COMMIT;
