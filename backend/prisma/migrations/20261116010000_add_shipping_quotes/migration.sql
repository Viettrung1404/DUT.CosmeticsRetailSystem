-- CreateTable: Bảng lưu báo giá tạm thời (Shipping Quotes) theo DES-05 & DES-07 EP03-T01
CREATE TABLE "shipping_quotes" (
    "id" UUID NOT NULL,
    "quote_group_id" UUID NOT NULL,
    "carrier_code" VARCHAR(50) NOT NULL,
    "service_code" VARCHAR(50) NOT NULL,
    "source_location_id" UUID NOT NULL,
    "estimated_fee" DECIMAL(12, 2) NOT NULL,
    "estimated_delivery_time" TIMESTAMPTZ NOT NULL,
    "distance_km" DECIMAL(10, 2),
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "unavailable_reason" VARCHAR(255),
    "expires_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shipping_quotes_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "chk_shipping_quote_fee_non_negative" CHECK ("estimated_fee" >= 0),
    CONSTRAINT "chk_shipping_quote_distance_non_negative" CHECK ("distance_km" IS NULL OR "distance_km" >= 0)
);

-- CreateIndex
CREATE INDEX "idx_quotes_group" ON "shipping_quotes"("quote_group_id", "expires_at");

-- AddForeignKey
ALTER TABLE "shipping_quotes" ADD CONSTRAINT "shipping_quotes_source_location_id_fkey" FOREIGN KEY ("source_location_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
