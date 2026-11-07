-- AlterTable
ALTER TABLE "purchase_orders" ADD COLUMN     "approved_at" TIMESTAMPTZ,
ADD COLUMN     "approved_by" UUID;

-- AlterTable
ALTER TABLE "supplier_payments" ADD COLUMN     "created_by" UUID;

-- CreateTable
CREATE TABLE "goods_receipts" (
    "id" UUID NOT NULL,
    "receipt_code" VARCHAR(50) NOT NULL,
    "purchase_order_id" UUID NOT NULL,
    "supplier_id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "delivered_by" VARCHAR(100),
    "received_by" UUID,
    "received_date" DATE NOT NULL,
    "total_cost" DECIMAL(12,2) NOT NULL,
    "invoice_number" VARCHAR(50),
    "invoice_date" DATE,
    "invoice_amount" DECIMAL(12,2),
    "note" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "goods_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "goods_receipts_receipt_code_key" ON "goods_receipts"("receipt_code");

-- CreateIndex
CREATE INDEX "goods_receipts_supplier_id_received_date_idx" ON "goods_receipts"("supplier_id", "received_date");

-- CreateIndex
CREATE INDEX "supplier_payments_supplier_id_status_idx" ON "supplier_payments"("supplier_id", "status");

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_received_by_fkey" FOREIGN KEY ("received_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_payments" ADD CONSTRAINT "supplier_payments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Ràng buộc viết tay (Prisma không biểu diễn được CHECK)
ALTER TABLE "purchase_orders" ADD CONSTRAINT "chk_po_status"
  CHECK (status IN ('DRAFT', 'SENT', 'CONFIRMED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED'));
ALTER TABLE "supplier_payments" ADD CONSTRAINT "chk_supplier_payment_status"
  CHECK (status IN ('PENDING', 'COMPLETED', 'CANCELLED'));
ALTER TABLE "supplier_payments" ADD CONSTRAINT "chk_supplier_payment_amount" CHECK (amount > 0);
ALTER TABLE "goods_receipts" ADD CONSTRAINT "chk_goods_receipt_amounts"
  CHECK (total_cost >= 0 AND (invoice_amount IS NULL OR invoice_amount >= 0));
ALTER TABLE "suppliers" ADD CONSTRAINT "chk_supplier_rating" CHECK (rating IS NULL OR rating BETWEEN 1 AND 5);
