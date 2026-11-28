import { isPromotionInSlot, isFeaturedProduct } from '@core/utils/flash-sale.util';
import {
  BadRequestException,
  ConflictException,
  Injectable,
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
    if (input.items.some((item) => !Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > 99))
      throw new BadRequestException({ code: 'INVALID_QUANTITY', message: 'Số lượng phải là số nguyên từ 1 đến 99' });
    const ids = input.items.map((item) => item.variantId);
    let now = new Date();
    if (lock && input.customerId)
      await tx.$queryRaw`SELECT id FROM customers WHERE id=${input.customerId}::uuid FOR UPDATE`;
    if (lock && input.couponCode)
      await tx.$queryRaw`SELECT id FROM coupons WHERE code=${input.couponCode} FOR UPDATE`;
    // Lock in ID order, including unlimited campaigns: admin edits must not
    // slip between the final price check and benefit reservation.
    if (lock) {
      await tx.$queryRaw`SELECT id FROM promotions WHERE is_active=true AND start_date<=${now} AND end_date>${now} ORDER BY id FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM promotion_variant_quotas WHERE product_variant_id=ANY(${ids}::uuid[]) ORDER BY id FOR UPDATE`;
      await tx.$queryRaw`SELECT v.id FROM product_variants v JOIN products p ON p.id=v.product_id WHERE v.id=ANY(${ids}::uuid[]) ORDER BY v.id FOR SHARE OF v,p`;
      now = new Date();
    }
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
      (row) => isPromotionInSlot(row.slotStartHour, now) && (row.usageLimit === null || row.usedCount < row.usageLimit),
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
    const campaigns: Campaign[] = active.map((p) => ({
      ...p,
      value: Number(p.value),
      quotas: p.quotas.map((quota) => ({
        ...quota,
        salePrice: quota.salePrice == null ? null : Number(isFeaturedProduct(
          quota.productRank, p.rotationProductCount, p.featuredProductCount, p.slotStartHour, now,
        ) ? quota.featuredSalePrice : quota.salePrice),
      })),
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
    });
    const quoteVersion = createHash('sha256')
      .update(
        JSON.stringify({ result, couponId: coupon?.id ?? null }),
      )
      .digest('hex');
    return {
      ...result,
      quoteVersion,
      calculatedAt: now.toISOString(),
      reservation: false,
      couponId: coupon?.id ?? null,
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
