ALTER TABLE "product_variants" ADD COLUMN "try_on_color_hex" VARCHAR(7);
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_try_on_color_hex_check"
  CHECK ("try_on_color_hex" IS NULL OR "try_on_color_hex" ~ '^#[0-9A-Fa-f]{6}$');
