import {
  BadRequestException,
  ConflictException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { Prisma } from '@prisma/client';
import { createHash } from 'crypto';
import { calculateCommercePrice, Campaign } from '../domain/pricing-engine';

export interface CommerceSelection {
  customerId?: string;
  items: { variantId: string; quantity: number }[];
  couponCode?: string;
  usePoints?: number;
}
@Injectable()
export class CommercePricingService {
  constructor(private readonly db: PrismaService) {}
  async quote(
    input: CommerceSelection,
    tx: Prisma.TransactionClient = this.db,
    lock = false,
  ) {
    const ids = input.items.map((item) => item.variantId);
    if (lock && input.customerId)
      await tx.$queryRaw`SELECT id FROM customers WHERE id=${input.customerId}::uuid FOR UPDATE`;
    if (lock && input.couponCode)
      await tx.$queryRaw`SELECT id FROM coupons WHERE code=${input.couponCode} FOR UPDATE`;
    // Campaign locks precede quota, variant and inventory locks for all writers.
    if (lock) {
      await tx.$queryRaw`SELECT id FROM promotions ORDER BY id FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM promotion_variant_quotas WHERE product_variant_id=ANY(${ids}::uuid[]) ORDER BY id FOR UPDATE`;
      await tx.$queryRaw`SELECT v.id FROM product_variants v JOIN products p ON p.id=v.product_id WHERE v.id=ANY(${ids}::uuid[]) ORDER BY v.id FOR SHARE OF v,p`;
    }
    const now = new Date();
    const [variants, customer, rows, coupon] = await Promise.all([
      tx.productVariant.findMany({
        where: {
          id: { in: ids },
          isActive: true,
          product: {
            isActive: true,
            category: { isActive: true },
            OR: [{ brandId: null }, { brand: { isActive: true } }],
          },
        },
        include: {
          product: { select: { id: true, name: true, categoryId: true } },
        },
      }),
      input.customerId
        ? tx.customer.findUniqueOrThrow({
            where: { id: input.customerId },
            include: { loyaltyTier: true },
          })
        : null,
      tx.promotion.findMany({
        where: {
          isActive: true,
          startDate: { lte: now },
          endDate: { gt: now },
        },
        include: { quotas: { where: { productVariantId: { in: ids } } } },
      }),
      input.couponCode
        ? tx.coupon.findUnique({ where: { code: input.couponCode } })
        : null,
    ]);
    if (variants.length !== ids.length)
      throw new BadRequestException('VARIANT_NOT_AVAILABLE');
    const active = rows.filter(
      (row) => row.usageLimit === null || row.usedCount < row.usageLimit,
    );
    if (input.couponCode) {
      const valid =
        coupon &&
        coupon.isActive &&
        coupon.startDate <= now &&
        coupon.endDate > now &&
        (!coupon.customerId || coupon.customerId === input.customerId) &&
        (coupon.maxUses === null || coupon.usedCount < coupon.maxUses) &&
        (!coupon.promotionId ||
          active.some((p) => p.id === coupon.promotionId));
      if (!valid) throw new BadRequestException('COUPON_NOT_AVAILABLE');
      if (
        !input.customerId ||
        (await tx.couponUsage.count({
          where: { couponId: coupon!.id, customerId: input.customerId },
        })) >= coupon!.maxUsesPerCustomer
      )
        throw new BadRequestException('COUPON_NOT_AVAILABLE');
    }
    let pointValue = 0;
    if (input.usePoints) {
      const config = await tx.setting.findUnique({
        where: { key: 'loyalty_config' },
      });
      pointValue = Number(
        (config?.value as { point_value_vnd?: number })?.point_value_vnd,
      );
      if (!Number.isSafeInteger(pointValue) || pointValue <= 0)
        throw new ServiceUnavailableException('POINT_VALUE_NOT_CONFIGURED');
    }
    const campaigns: Campaign[] = active.map((p) => ({
      ...p,
      value: Number(p.value),
      minOrderAmount: Number(p.minOrderAmount),
      maxDiscountAmount:
        p.maxDiscountAmount === null ? null : Number(p.maxDiscountAmount),
    }));
    const result = calculateCommercePrice({
      lines: input.items.map((item) => {
        const v = variants.find((v) => v.id === item.variantId)!;
        return {
          ...item,
          productId: v.productId,
          categoryId: v.product.categoryId,
          unitPrice: Number(v.price),
        };
      }),
      campaigns,
      tierPercentage: Number(customer?.loyaltyTier?.discountPercentage ?? 0),
      coupon: coupon
        ? {
            ...coupon,
            discountValue: Number(coupon.discountValue),
            minOrderAmount: Number(coupon.minOrderAmount),
            maxDiscountAmount:
              coupon.maxDiscountAmount === null
                ? null
                : Number(coupon.maxDiscountAmount),
          }
        : null,
      pointsRequested: input.usePoints ?? 0,
      availablePoints: customer?.totalPoints ?? 0,
      pointValue,
    });
    const quoteVersion = createHash('sha256')
      .update(
        JSON.stringify({ result, pointValue, couponId: coupon?.id ?? null }),
      )
      .digest('hex');
    return {
      ...result,
      quoteVersion,
      calculatedAt: now.toISOString(),
      reservation: false,
      couponId: coupon?.id ?? null,
      pointValue,
      variants,
    };
  }
  assertQuote(
    expected: string | undefined,
    actual: Awaited<ReturnType<CommercePricingService['quote']>>,
  ) {
    if (expected && expected !== actual.quoteVersion) {
      const { variants: _, ...pricing } = actual;
      throw new ConflictException({
        code: 'ORDER_PRICE_CHANGED',
        message: 'Giá đã thay đổi; vui lòng xác nhận lại',
        quoteVersion: actual.quoteVersion,
        pricing,
      });
    }
  }
}
