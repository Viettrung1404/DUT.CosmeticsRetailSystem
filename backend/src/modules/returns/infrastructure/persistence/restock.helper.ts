import { BadRequestException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { isBatchExpired } from '../../domain/return-rules';

export interface RestockParams {
  returnId: string;
  storeId: string;
  variantId: string;
  quantity: number;
  batchId: string;
  actorId: string;
  now?: Date;
}

// Nhập lại hàng trả bán lại được: cộng lô, cộng tồn tổng, ghi inventory_transactions loại RETURN
export async function restockReturnedItem(
  tx: Prisma.TransactionClient,
  p: RestockParams,
): Promise<void> {
  const now = p.now ?? new Date();
  const rows = await tx.$queryRaw<
    { id: string; store_id: string; product_variant_id: string; expiry_date: Date; is_active: boolean }[]
  >`SELECT id, store_id, product_variant_id, expiry_date, is_active FROM batches WHERE id = ${p.batchId}::uuid FOR UPDATE`;
  const batch = rows[0];
  if (!batch || batch.store_id !== p.storeId || batch.product_variant_id !== p.variantId) {
    throw new BadRequestException('Lô hàng không thuộc cửa hàng hoặc sản phẩm của dòng hàng trả');
  }
  if (!batch.is_active || isBatchExpired(new Date(batch.expiry_date), now)) {
    throw new ConflictException('Lô hàng đã hết hạn hoặc ngừng sử dụng, chỉ có thể ghi nhận hàng hỏng');
  }

  await tx.batch.update({
    where: { id: p.batchId },
    data: { quantity: { increment: p.quantity } },
  });
  await tx.inventory.upsert({
    where: { storeId_productVariantId: { storeId: p.storeId, productVariantId: p.variantId } },
    update: { quantity: { increment: p.quantity }, lastRestockAt: now },
    create: {
      storeId: p.storeId,
      productVariantId: p.variantId,
      quantity: p.quantity,
      lastRestockAt: now,
    },
  });
  await tx.inventoryTransaction.create({
    data: {
      storeId: p.storeId,
      productVariantId: p.variantId,
      batchId: p.batchId,
      transactionType: 'RETURN',
      quantity: p.quantity,
      referenceType: 'RETURN_ORDER',
      referenceId: p.returnId,
      note: 'Nhập lại hàng đổi trả bán lại được',
      createdBy: p.actorId,
    },
  });
}
