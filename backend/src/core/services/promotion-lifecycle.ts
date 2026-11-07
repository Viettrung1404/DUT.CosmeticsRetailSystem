import { Prisma } from '@prisma/client';
import { ConflictException } from '@nestjs/common';

export async function reservePromotionBenefits(
  tx: Prisma.TransactionClient,
  orderId: string,
  lines: {
    variantId: string;
    quantity: number;
    promotionId?: string | null;
    quotaId?: string | null;
  }[],
  extraPromotionIds: string[] = [],
) {
  const ids = [
    ...new Set([
      ...lines.flatMap((l) => (l.promotionId ? [l.promotionId] : [])),
      ...extraPromotionIds,
    ]),
  ].sort();
  if (!ids.length) return;
  const items = await tx.orderItem.findMany({
    where: { orderId },
    select: { id: true, productVariantId: true },
  });
  for (const line of [...lines]
    .filter((l) => l.quotaId)
    .sort((a, b) => a.quotaId!.localeCompare(b.quotaId!))) {
    const held =
      await tx.$executeRaw`UPDATE promotion_variant_quotas SET reserved_quantity=reserved_quantity+${line.quantity}
      WHERE id=${line.quotaId!}::uuid AND quota-reserved_quantity-consumed_quantity>=${line.quantity}`;
    if (held !== 1) throw new ConflictException('FLASH_SALE_EXHAUSTED');
    await tx.promotionAllocation.create({
      data: {
        promotionId: line.promotionId!,
        quotaId: line.quotaId!,
        orderId,
        orderItemId: items.find((i) => i.productVariantId === line.variantId)!
          .id,
        quantity: line.quantity,
      },
    });
  }
  for (const promotionId of ids) {
    const held =
      await tx.$executeRaw`UPDATE promotions SET used_count=used_count+1 WHERE id=${promotionId}::uuid AND (usage_limit IS NULL OR used_count<usage_limit)`;
    if (held !== 1) throw new ConflictException('PROMOTION_EXHAUSTED');
    await tx.promotionOrderUsage.create({ data: { promotionId, orderId } });
  }
}

/** Call before inventory locks. The order status trigger also enforces this contract. */
export async function transitionPromotionAllocations(
  tx: Prisma.TransactionClient,
  orderId: string,
  status: 'CONFIRMED' | 'CANCELLED',
) {
  await tx.$queryRaw`SELECT sprint5_transition_promotions(${orderId}::uuid, ${status}::text)::text`;
}
