import { BadRequestException } from '@nestjs/common';
import {
  PosCouponRule,
  PosPromotionRule,
  PosSaleVariant,
} from '../../../domain/entities/pos-sale.entity';
import {
  allocateProportionally,
  buildPosPricing,
  calculateCouponDiscount,
  pickBestPromotion,
} from '../pos-pricing.util';

const variant = (over: Partial<PosSaleVariant>): PosSaleVariant => ({
  variantId: 'v',
  productId: 'p',
  categoryId: 'c',
  productName: 'SP',
  variantName: null,
  sku: 'SKU',
  price: 100000,
  cost: 40000,
  isActive: true,
  productActive: true,
  onHand: 10,
  reserved: 0,
  expiredQuantity: 0,
  ...over,
});

const promo = (over: Partial<PosPromotionRule>): PosPromotionRule => ({
  id: 'km',
  name: 'KM',
  type: 'PERCENTAGE',
  value: 10,
  minOrderAmount: 0,
  maxDiscountAmount: null,
  productIds: null,
  categoryIds: null,
  usageLimit: null,
  usedCount: 0,
  ...over,
});

const coupon = (over: Partial<PosCouponRule> = {}): PosCouponRule => ({
  id: 'cp',
  code: 'GIAM40K',
  customerId: null,
  discountType: 'FIXED_AMOUNT',
  discountValue: 40000,
  minOrderAmount: 0,
  maxUses: null,
  usedCount: 0,
  maxUsesPerCustomer: 1,
  startDate: new Date('2026-01-01'),
  endDate: new Date('2027-01-01'),
  isActive: true,
  ...over,
});

const NOW = new Date('2026-10-23T05:00:00Z');
const base = { couponUsageCount: 0, customerId: 'kh', pointsToUse: 0, availablePoints: 0, now: NOW };

describe('allocateProportionally', () => {
  it('chia theo tỷ lệ, số lẻ dồn vào phần tử lớn nhất', () => {
    expect(allocateProportionally(40000, [270000, 100000])).toEqual([29190, 10810]);
  });

  it('tổng các phần luôn bằng số cần chia', () => {
    const shares = allocateProportionally(100, [1, 1, 1]);
    expect(shares.reduce((a, b) => a + b, 0)).toBe(100);
  });

  it('không có gì để chia thì trả 0', () => {
    expect(allocateProportionally(0, [5, 5])).toEqual([0, 0]);
    expect(allocateProportionally(10, [0, 0])).toEqual([0, 0]);
  });
});

describe('pickBestPromotion', () => {
  const v = variant({ price: 300000 });

  it('lấy mức giảm lớn nhất, không cộng dồn', () => {
    const best = pickBestPromotion(
      [promo({ id: 'a', value: 10 }), promo({ id: 'b', type: 'FIXED_AMOUNT', value: 50000 })],
      v,
      1,
      300000,
    );
    expect(best?.promotion.id).toBe('b');
    expect(best?.discount).toBe(50000);
  });

  it('khuyến mãi theo sản phẩm chỉ áp đúng sản phẩm', () => {
    expect(pickBestPromotion([promo({ productIds: ['khac'] })], v, 1, 300000)).toBeNull();
    expect(pickBestPromotion([promo({ productIds: ['p'] })], v, 1, 300000)?.discount).toBe(30000);
  });

  it('khuyến mãi theo danh mục', () => {
    expect(pickBestPromotion([promo({ categoryIds: ['c'] })], v, 1, 300000)?.discount).toBe(30000);
  });

  it('chặn khi chưa đạt đơn tối thiểu hoặc hết lượt', () => {
    expect(pickBestPromotion([promo({ minOrderAmount: 500000 })], v, 1, 300000)).toBeNull();
    expect(pickBestPromotion([promo({ usageLimit: 5, usedCount: 5 })], v, 1, 300000)).toBeNull();
  });

  it('phần trăm bị chặn bởi mức giảm tối đa', () => {
    expect(pickBestPromotion([promo({ maxDiscountAmount: 20000 })], v, 1, 300000)?.discount).toBe(
      20000,
    );
  });

  it('giảm cứng tính trên mỗi đơn vị và không vượt giá trị dòng', () => {
    const cheap = variant({ price: 30000 });
    const fixed = promo({ type: 'FIXED_AMOUNT', value: 20000 });
    expect(pickBestPromotion([fixed], cheap, 2, 60000)?.discount).toBe(40000);
    expect(
      pickBestPromotion([promo({ type: 'FIXED_AMOUNT', value: 50000 })], cheap, 1, 30000)?.discount,
    ).toBe(30000);
  });
});

describe('buildPosPricing - đơn chị Hoa', () => {
  const lines = [
    { variant: variant({ variantId: 'a', productId: 'pa', price: 300000 }), quantity: 1 },
    { variant: variant({ variantId: 'b', productId: 'pb', price: 100000 }), quantity: 1 },
  ];

  it('KM -10% Son A, voucher 40.000, điểm 30.000: chia xuống từng dòng', () => {
    const pricing = buildPosPricing({
      ...base,
      lines,
      promotions: [promo({ productIds: ['pa'] })],
      coupon: coupon(),
      pointsToUse: 30000,
      availablePoints: 60000,
    });

    expect(pricing.subtotal).toBe(400000);
    expect(pricing.promotionDiscount).toBe(30000);
    expect(pricing.couponDiscount).toBe(40000);
    expect(pricing.pointsDiscount).toBe(30000);
    expect(pricing.total).toBe(300000);

    const [a, b] = pricing.lines;
    expect(a.discountAmount).toBe(30000 + 29190);
    expect(b.discountAmount).toBe(10810);
    expect(a.pointsDiscount).toBe(21892);
    expect(b.pointsDiscount).toBe(8108);
    expect(a.lineTotal + b.lineTotal - a.pointsDiscount - b.pointsDiscount).toBe(300000);
    expect(a.promotionId).toBe('km');
    expect(b.promotionId).toBeNull();
  });

  it('không giảm gì thì tổng bằng tạm tính', () => {
    const pricing = buildPosPricing({ ...base, lines, promotions: [], coupon: null });
    expect(pricing.total).toBe(400000);
    expect(pricing.lines.every((l) => l.discountAmount === 0 && l.pointsDiscount === 0)).toBe(true);
  });

  it('voucher hết hạn thì báo lỗi', () => {
    expect(() =>
      buildPosPricing({
        ...base,
        lines,
        promotions: [],
        coupon: coupon({ endDate: new Date('2026-01-02') }),
      }),
    ).toThrow(BadRequestException);
  });

  it('voucher dành riêng khách khác thì chặn', () => {
    expect(() =>
      buildPosPricing({
        ...base,
        lines,
        promotions: [],
        coupon: coupon({ customerId: 'nguoi-khac' }),
      }),
    ).toThrow('dành riêng');
  });

  it('khách đã dùng hết lượt voucher thì chặn', () => {
    expect(() =>
      buildPosPricing({ ...base, couponUsageCount: 1, lines, promotions: [], coupon: coupon() }),
    ).toThrow('hết lượt');
  });

  it('voucher % tính trên giá trị sau khuyến mãi và không vượt giá trị đơn', () => {
    const pricing = buildPosPricing({
      ...base,
      lines,
      promotions: [promo({ productIds: ['pa'] })],
      coupon: coupon({ discountType: 'PERCENTAGE', discountValue: 10 }),
    });
    expect(pricing.couponDiscount).toBe(37000);
    const huge = buildPosPricing({
      ...base,
      lines: [lines[1]],
      promotions: [],
      coupon: coupon({ discountValue: 999999 }),
    });
    expect(huge.total).toBe(0);
  });

  it('điểm chỉ tính trên phần còn lại sau KM và voucher (50%)', () => {
    expect(() =>
      buildPosPricing({
        ...base,
        lines: [lines[1]],
        promotions: [],
        coupon: null,
        pointsToUse: 60000,
        availablePoints: 100000,
      }),
    ).toThrow('tối đa 50%');
  });
});

describe('calculateCouponDiscount - loại FIXED theo tài liệu 04', () => {
  it('giảm cứng đúng giá trị, không vượt tổng', () => {
    const fixed = coupon({ discountType: 'FIXED', discountValue: 40000 });
    expect(calculateCouponDiscount(fixed, 200000, 'kh', 0, NOW)).toBe(40000);
    expect(calculateCouponDiscount(fixed, 30000, 'kh', 0, NOW)).toBe(30000);
  });
});
