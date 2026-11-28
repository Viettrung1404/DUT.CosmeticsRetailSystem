
ALTER TABLE promotions ADD COLUMN slot_start_hour integer,
  ADD COLUMN rotation_product_count integer NOT NULL DEFAULT 0,
  ADD COLUMN featured_product_count integer NOT NULL DEFAULT 20,
  ADD CONSTRAINT flash_slot_hour CHECK (slot_start_hour IS NULL OR (slot_start_hour BETWEEN 0 AND 22 AND slot_start_hour % 2 = 0)),
  ADD CONSTRAINT flash_rotation_count CHECK (rotation_product_count >= 0 AND featured_product_count >= 0);
ALTER TABLE promotion_variant_quotas ADD COLUMN sale_price numeric(12,2),
  ADD COLUMN featured_sale_price numeric(12,2), ADD COLUMN product_rank integer,
  ADD CONSTRAINT flash_variant_prices CHECK (sale_price IS NULL OR
    (sale_price > 0 AND featured_sale_price > 0 AND featured_sale_price < sale_price AND product_rank >= 0));
CREATE FUNCTION glowup_slot_active(slot integer, at_time timestamptz DEFAULT now())
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT slot IS NULL OR floor(extract(hour FROM at_time AT TIME ZONE 'Asia/Ho_Chi_Minh') / 2)::int * 2 = slot
$$;
CREATE FUNCTION glowup_featured(rank integer, total integer, count integer, slot integer, at_time timestamptz DEFAULT now())
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT CASE WHEN rank IS NULL OR total <= 0 OR slot IS NULL THEN false ELSE
    mod(mod(rank - (((at_time AT TIME ZONE 'Asia/Ho_Chi_Minh')::date - DATE '2026-11-26') * 12 + slot / 2) * count, total) + total, total) < LEAST(count,total) END
$$;
CREATE FUNCTION glowup_quota_price(regular numeric, featured numeric, rank integer, total integer, count integer, slot integer, at_time timestamptz DEFAULT now())
RETURNS numeric LANGUAGE sql STABLE AS $$
  SELECT CASE WHEN glowup_featured(rank,total,count,slot,at_time) THEN featured ELSE regular END
$$;
CREATE OR REPLACE FUNCTION sprint5_variant_price(target_variant uuid, tier_percentage numeric)
RETURNS numeric LANGUAGE plpgsql STABLE AS $$
DECLARE v record; campaign record; discount numeric; best numeric; target numeric;
BEGIN
  SELECT pv.price,pv.product_id,p.category_id INTO v FROM product_variants pv
    JOIN products p ON p.id=pv.product_id WHERE pv.id=target_variant;
  IF NOT FOUND THEN RETURN NULL; END IF;
  best=trunc(v.price*LEAST(100,GREATEST(0,tier_percentage))/100,2);
  FOR campaign IN SELECT p.*,q.sale_price,q.featured_sale_price,q.product_rank
    FROM promotions p LEFT JOIN promotion_variant_quotas q ON q.promotion_id=p.id AND q.product_variant_id=target_variant
    WHERE p.is_active AND p.start_date<=now() AND p.end_date>now() AND glowup_slot_active(p.slot_start_hour)
      AND p.min_order_amount=0 AND (p.usage_limit IS NULL OR p.used_count<p.usage_limit)
      AND p.type IN ('PERCENTAGE','FIXED_AMOUNT')
      AND ((COALESCE(p.applicable_products,'[]'::jsonb)='[]'::jsonb AND COALESCE(p.applicable_categories,'[]'::jsonb)='[]'::jsonb)
        OR p.applicable_products ? v.product_id::text OR p.applicable_categories ? v.category_id::text)
      AND (NOT p.is_flash_sale OR q.quota-q.reserved_quantity-q.consumed_quantity>=1)
    ORDER BY p.id LOOP
    target=glowup_quota_price(campaign.sale_price,campaign.featured_sale_price,campaign.product_rank,
      campaign.rotation_product_count,campaign.featured_product_count,campaign.slot_start_hour);
    IF target IS NOT NULL THEN discount=GREATEST(0,v.price-target);
    ELSE discount=CASE WHEN campaign.type='PERCENTAGE' THEN trunc(v.price*campaign.value/100,2) ELSE campaign.value END;
    END IF;
    discount=LEAST(v.price,discount,COALESCE(campaign.max_discount_amount,v.price));
    best=GREATEST(best,discount);
  END LOOP;
  RETURN GREATEST(0,v.price-best);
END $$;
