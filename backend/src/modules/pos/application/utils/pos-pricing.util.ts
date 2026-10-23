import { BadRequestException } from '@nestjs/common';
import { calculatePointsRedemption } from '@core/utils/loyalty-policy.util';
import {
  PosCouponRule,
  PosPricedLine,
  PosPricing,
  PosPromotionRule,
  PosSaleVariant,
} from '../../domain/entities/pos-sale.entity';

export interface PosPricingLineInput {
  variant: PosSaleVariant;
  quantity: number;
}

export interface PosPricingInput {
  lines: PosPricingLineInput[];
  promotions: PosPromotionRule[];
  coupon: PosCouponRule | null;
  couponUsageCount: number;
  customerId: string | null;
  pointsToUse: number;
  availablePoints: number;
  now: Date;
}

const sum = (values: number[]): number => values.reduce((a, b) => a + b, 0);

// Chia amount theo tỷ lệ weights, phần lẻ dồn vào phần tử lớn nhất (S2) nên tổng các phần luôn bằng amount
export const allocateProportionally = (amount: number, weights: number[]): number[] => {
  const totalWeight = sum(weights);
  if (amount <= 0 || totalWeight <= 0) {
    return weights.map(() => 0);
  }
  const shares = weights.map((w) => Math.floor((amount * w) / totalWeight));
  const remainder = amount - sum(shares);
  if (remainder !== 0) {
    let largest = 0;
    weights.forEach((w, i) => {
      if (w > weights[largest]) largest = i;
    });
    shares[largest] += remainder;
  }
  return shares;
};

const isPromotionApplicable = (
  promotion: PosPromotionRule,
  variant: PosSaleVariant,
  orderSubtotal: number,
): boolean => {
  if (promotion.minOrderAmount > orderSubtotal) return false;
  if (promotion.usageLimit !== null && promotion.usedCount >= promotion.usageLimit) return false;
  const hasProducts = !!promotion.productIds?.length;
  const hasCategories = !!promotion.categoryIds?.length;
  if (!hasProducts && !hasCategories) return true;
  return (
    (hasProducts && promotion.productIds!.includes(variant.productId)) ||
    (hasCategories && promotion.categoryIds!.includes(variant.categoryId))
  );
};

const promotionDiscount = (promotion: PosPromotionRule, unitPrice: number, quantity: number) => {
  const gross = unitPrice * quantity;
  if (promotion.type === 'PERCENTAGE') {
    const raw = Math.round((gross * promotion.value) / 100);
    const capped =
      promotion.maxDiscountAmount && promotion.maxDiscountAmount > 0
        ? Math.min(raw, promotion.maxDiscountAmount)
        : raw;
    return Math.min(capped, gross);
  }
  // FIXED_AMOUNT: giảm cứng trên mỗi đơn vị sản phẩm
  return Math.min(promotion.value * quantity, gross);
};

// P10: nhiều khuyến mãi cùng áp một dòng thì lấy mức giảm lớn nhất, không cộng dồn (M1)
export const pickBestPromotion = (
  promotions: PosPromotionRule[],
  variant: PosSaleVariant,
  quantity: number,
  orderSubtotal: number,
): { promotion: PosPromotionRule; discount: number } | null => {
  let best: { promotion: PosPromotionRule; discount: number } | null = null;
  for (const promotion of promotions) {
    if (!isPromotionApplicable(promotion, variant, orderSubtotal)) continue;
    const discount = promotionDiscount(promotion, variant.price, quantity);
    if (discount > 0 && (!best || discount > best.discount)) {
      best = { promotion, discount };
    }
  }
  return best;
};

export const calculateCouponDiscount = (
  coupon: PosCouponRule,
  base: number,
  customerId: string | null,
  customerUsageCount: number,
  now: Date,
): number => {
  if (!coupon.isActive || now < coupon.startDate || now > coupon.endDate) {
    throw new BadRequestException('Mã giảm giá đã hết hạn hoặc chưa đến đợt áp dụng');
  }
  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
    throw new BadRequestException('Mã giảm giá đã hết lượt sử dụng');
  }
  if (coupon.customerId && coupon.customerId !== customerId) {
    throw new BadRequestException('Mã giảm giá này dành riêng cho khách hàng khác');
  }
  if (customerUsageCount >= coupon.maxUsesPerCustomer) {
    throw new BadRequestException('Khách đã sử dụng hết lượt cho mã giảm giá này');
  }
  if (coupon.minOrderAmount > 0 && base < coupon.minOrderAmount) {
    throw new BadRequestException('Đơn hàng chưa đạt giá trị tối thiểu để áp dụng mã giảm giá này');
  }
  const raw =
    coupon.discountType === 'PERCENTAGE'
      ? Math.round((base * coupon.discountValue) / 100)
      : coupon.discountValue;
  return Math.min(raw, base);
};

// Thứ tự P10: khuyến mãi tự động -> tối đa 1 voucher (BR-11) -> điểm. Voucher và điểm được chia xuống từng dòng (S2)
export const buildPosPricing = (input: PosPricingInput): PosPricing => {
  const grossList = input.lines.map((l) => l.variant.price * l.quantity);
  const subtotal = sum(grossList);

  const promos = input.lines.map((l) =>
    pickBestPromotion(input.promotions, l.variant, l.quantity, subtotal),
  );
  const afterPromo = grossList.map((g, i) => g - (promos[i]?.discount ?? 0));
  const afterPromoTotal = sum(afterPromo);

  let couponDiscount = 0;
  if (input.coupon) {
    couponDiscount = calculateCouponDiscount(
      input.coupon,
      afterPromoTotal,
      input.customerId,
      input.couponUsageCount,
      input.now,
    );
  }
  const couponShares = allocateProportionally(couponDiscount, afterPromo);

  const base = afterPromoTotal - couponDiscount;
  const pointsDiscount = calculatePointsRedemption(input.pointsToUse, input.availablePoints, base);
  const afterCoupon = afterPromo.map((v, i) => v - couponShares[i]);
  const pointShares = allocateProportionally(pointsDiscount, afterCoupon);

  const lines: PosPricedLine[] = input.lines.map((l, i) => {
    const promotionDiscountOfLine = promos[i]?.discount ?? 0;
    const discountAmount = promotionDiscountOfLine + couponShares[i];
    return {
      variantId: l.variant.variantId,
      productId: l.variant.productId,
      productName: l.variant.productName,
      variantName: l.variant.variantName,
      sku: l.variant.sku,
      quantity: l.quantity,
      unitPrice: l.variant.price,
      unitCost: l.variant.cost,
      gross: grossList[i],
      promotionId: promos[i]?.promotion.id ?? null,
      promotionName: promos[i]?.promotion.name ?? null,
      promotionDiscount: promotionDiscountOfLine,
      couponDiscount: couponShares[i],
      discountAmount,
      pointsDiscount: pointShares[i],
      lineTotal: grossList[i] - discountAmount,
    };
  });

  return {
    lines,
    subtotal,
    promotionDiscount: subtotal - afterPromoTotal,
    couponDiscount,
    pointsDiscount,
    pointsUsed: pointsDiscount > 0 ? input.pointsToUse : 0,
    total: base - pointsDiscount,
  };
};
