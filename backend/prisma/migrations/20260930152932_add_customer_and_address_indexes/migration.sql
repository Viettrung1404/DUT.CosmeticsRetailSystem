-- CreateIndex
CREATE INDEX "customer_addresses_customer_id_is_default_idx" ON "customer_addresses"("customer_id", "is_default");

-- CreateIndex
CREATE INDEX "customers_loyalty_tier_id_idx" ON "customers"("loyalty_tier_id");
