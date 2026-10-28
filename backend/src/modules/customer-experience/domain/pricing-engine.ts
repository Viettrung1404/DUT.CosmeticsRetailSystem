import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { allocateMoney } from '@modules/customer-commerce/domain/money';
import { calculatePointsRedemption, POINT_VALUE_VND } from '@core/utils/loyalty-policy.util';

export interface PriceLine {
  variantId: string;
  productId: string;
  categoryId: string;
  unitPrice: number;
  quantity: number;
}
export interface Campaign {
  id: string;
  type: string;
  value: number;
  minOrderAmount: number;
  maxDiscountAmount: number | null;
  isFlashSale: boolean;
  applicableProducts: unknown;
  applicableCategories: unknown;
  quotas: {
    id: string;
    productVariantId: string;
    quota: number;
    reservedQuantity: number;
    consumedQuantity: number;
  }[];
}
export interface PriceCoupon {
  id: string;
  discountType: string;
  discountValue: number;
  minOrderAmount: number;
  maxDiscountAmount: number | null;
  promotionId: string | null;
}
const decimal = (n: number) => new Prisma.Decimal(n);
const money = (n: Prisma.Decimal | number) =>
  new Prisma.Decimal(n)
    .toDecimalPlaces(2, Prisma.Decimal.ROUND_DOWN)
    .toNumber();
export function campaignApplies(campaign: Campaign, line: PriceLine): boolean {
  const products = campaign.applicableProducts,
    categories = campaign.applicableCategories;
  if (products !== null && products !== undefined && !Array.isArray(products))
    throw new BadRequestException('INVALID_PROMOTION_SCOPE');
  if (
    categories !== null &&
    categories !== undefined &&
    !Array.isArray(categories)
  )
    throw new BadRequestException('INVALID_PROMOTION_SCOPE');
  return (
    ((!Array.isArray(products) || !products.length) &&
      (!Array.isArray(categories) || !categories.length)) ||
    (Array.isArray(products) && products.includes(line.productId)) ||
    (Array.isArray(categories) && categories.includes(line.categoryId))
  );
}
function benefit(
  type: string,
  value: number,
  base: number,
  cap: number | null,
) {
  if (
    !Number.isFinite(value) ||
    value < 0 ||
    (cap !== null && (!Number.isFinite(cap) || cap < 0))
  )
    throw new BadRequestException('INVALID_DISCOUNT');
  let result: Prisma.Decimal;
  if (type === 'PERCENTAGE') {
    if (value > 100) throw new BadRequestException('INVALID_DISCOUNT');
    result = decimal(base).mul(value).div(100);
  } else if (type === 'FIXED_AMOUNT' || type === 'FIXED')
    result = decimal(value);
  else throw new BadRequestException('INVALID_DISCOUNT_TYPE');
  return money(Prisma.Decimal.min(base, result, cap === null ? base : cap));
}
export function calculateCommercePrice(input: {
  lines: PriceLine[];
  campaigns: Campaign[];
  tierPercentage: number;
  coupon?: PriceCoupon | null;
  pointsRequested: number;
  availablePoints: number;
}) {
  if (
    !input.lines.length ||
    input.lines.length > 100 ||
    new Set(input.lines.map((l) => l.variantId)).size !== input.lines.length ||
    input.lines.some(
      (l) =>
        !Number.isSafeInteger(l.quantity) ||
        l.quantity < 1 ||
        !Number.isFinite(l.unitPrice) ||
        l.unitPrice < 0,
    )
  )
    throw new BadRequestException('INVALID_PRICE_LINES');
  if (
    !Number.isFinite(input.tierPercentage) ||
    input.tierPercentage < 0 ||
    input.tierPercentage > 100
  )
    throw new BadRequestException('INVALID_TIER_DISCOUNT');
  const weights = input.lines.map((line) =>
    money(decimal(line.unitPrice).mul(line.quantity)),
  );
  const subtotal = money(weights.reduce((sum, n) => sum.add(n), decimal(0)));
  const candidateShares = new Map<string, number[]>();
  const eligible = [...input.campaigns]
    .sort((a, b) => a.id.localeCompare(b.id))
    .filter((c) => c.minOrderAmount <= subtotal);
  for (const campaign of eligible) {
    if (campaign.type === 'FREE_SHIPPING') continue;
    const eligibleWeights = input.lines.map((line, i) => {
      if (!campaignApplies(campaign, line)) return 0;
      const quota = campaign.quotas.find(
        (q) => q.productVariantId === line.variantId,
      );
      if (
        campaign.isFlashSale &&
        (!quota ||
          quota.quota - quota.reservedQuantity - quota.consumedQuantity <
            line.quantity)
      )
        return 0;
      return weights[i];
    });
    const base = money(eligibleWeights.reduce((a, b) => a.add(b), decimal(0)));
    candidateShares.set(
      campaign.id,
      allocateMoney(
        benefit(
          campaign.type,
          campaign.value,
          base,
          campaign.maxDiscountAmount,
        ),
        eligibleWeights,
      ),
    );
  }
  const lines = input.lines.map((line, i) => {
    const tierDiscount = money(
      decimal(weights[i]).mul(input.tierPercentage).div(100),
    );
    let discount = tierDiscount,
      selected: Campaign | undefined;
    for (const campaign of eligible) {
      const candidate = candidateShares.get(campaign.id)?.[i] ?? 0;
      // Ties go to tier, then lexicographically smallest campaign ID.
      if (candidate > discount) {
        discount = candidate;
        selected = campaign;
      }
    }
    return {
      ...line,
      originalPrice: line.unitPrice,
      effectivePrice: money(
        decimal(weights[i]).minus(discount).div(line.quantity),
      ),
      lineDiscount: discount,
      tierDiscount: selected ? 0 : tierDiscount,
      promotionDiscount: selected ? discount : 0,
      promotionId: selected?.id ?? null,
      quotaId: selected?.isFlashSale
        ? selected.quotas.find((q) => q.productVariantId === line.variantId)!.id
        : null,
      afterLineDiscount: money(decimal(weights[i]).minus(discount)),
    };
  });
  const afterLines = money(
    lines.reduce((sum, line) => sum.add(line.afterLineDiscount), decimal(0)),
  );
  const couponCampaign = input.coupon?.promotionId
    ? input.campaigns.find((c) => c.id === input.coupon!.promotionId)
    : undefined;
  if (
    input.coupon?.promotionId &&
    (!couponCampaign ||
      subtotal < couponCampaign.minOrderAmount ||
      couponCampaign.isFlashSale)
  )
    throw new BadRequestException('COUPON_CAMPAIGN_NOT_AVAILABLE');
  const couponWeights = lines.map((line) =>
    !input.coupon?.promotionId ||
    (couponCampaign && campaignApplies(couponCampaign, line))
      ? line.afterLineDiscount
      : 0,
  );
  const couponBase = money(
    couponWeights.reduce((sum, n) => sum.add(n), decimal(0)),
  );
  if (input.coupon && couponBase < input.coupon.minOrderAmount)
    throw new BadRequestException('COUPON_MINIMUM_NOT_MET');
  const couponDiscount = input.coupon
    ? benefit(
        input.coupon.discountType,
        input.coupon.discountValue,
        couponBase,
        input.coupon.maxDiscountAmount,
      )
    : 0;
  const couponShares = allocateMoney(couponDiscount, couponWeights);
  if (!Number.isSafeInteger(input.pointsRequested) || input.pointsRequested < 0)
    throw new BadRequestException('INSUFFICIENT_POINTS');
  const pointsDiscount = input.pointsRequested
    ? calculatePointsRedemption(
        input.pointsRequested,
        input.availablePoints,
        money(decimal(afterLines).minus(couponDiscount)),
      )
    : 0;
  const pointsUsed = pointsDiscount / POINT_VALUE_VND;
  const pointWeights = lines.map((line, i) =>
    money(decimal(line.afterLineDiscount).minus(couponShares[i])),
  );
  const pointShares = allocateMoney(pointsDiscount, pointWeights);
  const pointUnits = allocateMoney(pointsUsed / 100, pointShares).map((n) =>
    Math.round(n * 100),
  );
  const merchandisePayable = money(
    decimal(afterLines).minus(couponDiscount).minus(pointsDiscount),
  );
  const shippingCampaign = eligible.find(
    (c) =>
      c.type === 'FREE_SHIPPING' &&
      !c.isFlashSale &&
      lines.some((l) => campaignApplies(c, l)),
  );
  const shippingFee =
    merchandisePayable >= 500000 || shippingCampaign ? 0 : 30000;
  const pricedLines = lines.map((line, i) => ({
    ...line,
    couponDiscount: couponShares[i],
    pointsValue: pointShares[i],
    pointsUsed: pointUnits[i],
    cashValue: money(
      decimal(line.afterLineDiscount)
        .minus(couponShares[i])
        .minus(pointShares[i]),
    ),
  }));
  return {
    subtotal,
    lineDiscount: money(subtotal - afterLines),
    couponDiscount,
    pointsDiscount,
    pointsUsed,
    shippingFee,
    shippingPromotionId: shippingCampaign?.id ?? null,
    taxAmount: 0,
    totalAmount: money(decimal(merchandisePayable).add(shippingFee)),
    items: pricedLines,
  };
}
export type CommercePrice = ReturnType<typeof calculateCommercePrice>;
