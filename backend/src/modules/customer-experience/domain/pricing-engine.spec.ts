import { calculateCommercePrice, Campaign, PriceLine } from './pricing-engine';

const line = (
  variantId = 'v1',
  unitPrice = 100000,
  quantity = 1,
): PriceLine => ({
  variantId,
  productId: 'p1',
  categoryId: 'c1',
  unitPrice,
  quantity,
});
const campaign = (data: Partial<Campaign> = {}): Campaign => ({
  id: 'promo1',
  type: 'PERCENTAGE',
  value: 20,
  minOrderAmount: 0,
  maxDiscountAmount: null,
  isFlashSale: false,
  applicableProducts: null,
  applicableCategories: null,
  quotas: [],
  ...data,
});
const price = (
  data: Partial<Parameters<typeof calculateCommercePrice>[0]> = {},
) =>
  calculateCommercePrice({
    lines: [line()],
    campaigns: [],
    tierPercentage: 0,
    pointsRequested: 0,
    availablePoints: 0,
    pointValue: 1000,
    ...data,
  });
describe('Sprint 5 shared pricing engine', () => {
  it('chooses tier over promotion without reserving a quota; ties go to tier', () => {
    for (const percentage of [20, 25]) {
      const quote = price({
        tierPercentage: percentage,
        campaigns: [
          campaign({
            isFlashSale: true,
            quotas: [
              {
                id: 'q1',
                productVariantId: 'v1',
                quota: 1,
                reservedQuantity: 0,
                consumedQuantity: 0,
              },
            ],
          }),
        ],
      });
      expect(quote.items[0]).toMatchObject({
        tierDiscount: percentage * 1000,
        promotionId: null,
        quotaId: null,
      });
    }
  });
  it('chooses best campaign, with stable tie-breaking and no stacking', () => {
    const quote = price({
      tierPercentage: 5,
      campaigns: [
        campaign({ id: 'z', value: 30 }),
        campaign({ id: 'a', value: 30 }),
      ],
    });
    expect(quote.items[0]).toMatchObject({
      promotionId: 'a',
      promotionDiscount: 30000,
      tierDiscount: 0,
      cashValue: 70000,
    });
  });
  it('uses order-level promotion minimum and cap once across eligible lines', () => {
    const quote = price({
      lines: [line('v1'), line('v2')],
      campaigns: [
        campaign({
          value: 50,
          minOrderAmount: 150000,
          maxDiscountAmount: 30000,
        }),
      ],
    });
    expect(quote.lineDiscount).toBe(30000);
    expect(quote.items.map((i) => i.promotionDiscount)).toEqual([15000, 15000]);
  });
  it('excludes full Flash Sale quota, including quantities above remaining quota', () => {
    const quote = price({
      lines: [line('v1', 100000, 2)],
      campaigns: [
        campaign({
          isFlashSale: true,
          quotas: [
            {
              id: 'q1',
              productVariantId: 'v1',
              quota: 3,
              reservedQuantity: 1,
              consumedQuantity: 1,
            },
          ],
        }),
      ],
    });
    expect(quote.lineDiscount).toBe(0);
  });
  it('applies coupon after line discount, then only usable whole points', () => {
    const quote = price({
      campaigns: [campaign()],
      coupon: {
        id: 'c',
        discountType: 'PERCENTAGE',
        discountValue: 50,
        minOrderAmount: 0,
        maxDiscountAmount: 10000,
        promotionId: null,
      },
      pointsRequested: 100,
      availablePoints: 100,
      pointValue: 3000,
    });
    expect(quote).toMatchObject({
      lineDiscount: 20000,
      couponDiscount: 10000,
      pointsUsed: 23,
      pointsDiscount: 69000,
      totalAmount: 31000,
    });
    expect(quote.items[0]).toMatchObject({
      cashValue: 1000,
      couponDiscount: 10000,
      pointsValue: 69000,
    });
  });
  it('respects a zero coupon cap and never silently accepts an unknown discount type', () => {
    const coupon = {
      id: 'c',
      discountType: 'PERCENTAGE',
      discountValue: 50,
      minOrderAmount: 0,
      maxDiscountAmount: 0,
      promotionId: null,
    };
    expect(price({ coupon }).couponDiscount).toBe(0);
    expect(() =>
      price({ coupon: { ...coupon, discountType: 'UNKNOWN' } }),
    ).toThrow('INVALID_DISCOUNT_TYPE');
  });
  it('handles FREE_SHIPPING without changing product value', () => {
    const quote = price({ campaigns: [campaign({ type: 'FREE_SHIPPING' })] });
    expect(quote).toMatchObject({
      lineDiscount: 0,
      shippingFee: 0,
      totalAmount: 100000,
      shippingPromotionId: 'promo1',
    });
  });
  it('checks free shipping threshold after all discounts', () => {
    expect(price({ lines: [line('v1', 500000)] }).shippingFee).toBe(0);
    expect(
      price({ lines: [line('v1', 500000)], tierPercentage: 1 }).shippingFee,
    ).toBe(30000);
  });
  it('preserves allocated money and whole point units across partial-return snapshots', () => {
    const quote = price({
      lines: [line('v1', 3.33), line('v2', 3.34), line('v3', 3.33)],
      pointsRequested: 7,
      availablePoints: 7,
      pointValue: 1,
    });
    expect(quote.items.reduce((s, l) => s + l.pointsUsed, 0)).toBe(7);
    expect(quote.items.reduce((s, l) => s + l.pointsValue, 0)).toBeCloseTo(
      7,
      2,
    );
    expect(quote.items.reduce((s, l) => s + l.cashValue, 0)).toBeCloseTo(3, 2);
  });
  it('rejects duplicate variants, negative amounts, invalid tier and excess points', () => {
    expect(() => price({ lines: [line(), line()] })).toThrow();
    expect(() => price({ lines: [line('v1', -1)] })).toThrow();
    expect(() => price({ tierPercentage: 101 })).toThrow();
    expect(() => price({ pointsRequested: 2, availablePoints: 1 })).toThrow();
  });
});
