-- AlterTable products
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "how_to_use" TEXT;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "specifications" JSONB;

-- AlterTable product_ingredients
ALTER TABLE "product_ingredients" ADD COLUMN IF NOT EXISTS "purpose" VARCHAR(500);
