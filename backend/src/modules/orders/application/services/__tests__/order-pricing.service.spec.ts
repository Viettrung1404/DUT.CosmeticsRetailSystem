import { BadRequestException } from '@nestjs/common';
import { OrderPricingService } from '../order-pricing.service';

describe('OrderPricingService (TDD)', () => {
  let pricingService: OrderPricingService;

  beforeEach(() => {
    pricingService = new OrderPricingService();
  });

  describe('Subtotal & Shipping Fee Calculation', () => {
    it('should calculate subtotal correctly and apply standard shipping fee (30,000 VND) when subtotal < 500,000 VND', () => {
      const items = [
        { unitPrice: 150000, quantity: 2 }, // 300k
        { unitPrice: 100000, quantity: 1 }, // 100k
      ];

      const res = pricingService.calculatePricing({
        items,
      });

      expect(res.subtotal).toBe(400000);
      expect(res.shippingFee).toBe(30000);
      expect(res.discountAmount).toBe(0);
      expect(res.pointsDiscount).toBe(0);
      expect(res.totalAmount).toBe(430000);
    });

    it('should grant free shipping when subtotal >= 500,000 VND', () => {
      const items = [{ unitPrice: 260000, quantity: 2 }]; // 520k

      const res = pricingService.calculatePricing({
        items,
      });

      expect(res.subtotal).toBe(520000);
      expect(res.shippingFee).toBe(0);
      expect(res.totalAmount).toBe(520000);
    });
  });

  describe('Coupon Validation & Discount Calculation', () => {
    const validPercentageCoupon = {
      id: 'cpn-1',
      code: 'SALE10',
      discountType: 'PERCENTAGE',
      discountValue: 10, // 10%
      minOrderAmount: 200000,
      maxUses: 100,
      usedCount: 10,
      maxUsesPerCustomer: 1,
      startDate: new Date(Date.now() - 86400000),
      endDate: new Date(Date.now() + 86400000),
      isActive: true,
    };

    it('should apply percentage discount correctly', () => {
      const items = [{ unitPrice: 600000, quantity: 1 }];

      const res = pricingService.calculatePricing({
        items,
        coupon: validPercentageCoupon as any,
        customerCouponUsageCount: 0,
      });

      expect(res.subtotal).toBe(600000);
      expect(res.discountAmount).toBe(60000); // 10% of 600k = 60k
      expect(res.totalAmount).toBe(540000); // 600k - 60k + 0 ship
    });

    it('should throw BadRequestException if customer has exceeded max_uses_per_customer', () => {
      const items = [{ unitPrice: 600000, quantity: 1 }];

      expect(() =>
        pricingService.calculatePricing({
          items,
          coupon: validPercentageCoupon as any,
          customerCouponUsageCount: 1, // maxUsesPerCustomer is 1
        }),
      ).toThrow(new BadRequestException('Bạn đã sử dụng hết lượt cho mã giảm giá này'));
    });

    it('should throw BadRequestException if subtotal is below coupon minOrderAmount', () => {
      const items = [{ unitPrice: 150000, quantity: 1 }]; // 150k < min 200k

      expect(() =>
        pricingService.calculatePricing({
          items,
          coupon: validPercentageCoupon as any,
          customerCouponUsageCount: 0,
        }),
      ).toThrow(new BadRequestException('Đơn hàng chưa đạt giá trị tối thiểu để áp dụng mã giảm giá này'));
    });

    it('should throw BadRequestException if coupon is expired or inactive', () => {
      const expiredCoupon = {
        ...validPercentageCoupon,
        endDate: new Date(Date.now() - 10000), // expired
      };

      expect(() =>
        pricingService.calculatePricing({
          items: [{ unitPrice: 300000, quantity: 1 }],
          coupon: expiredCoupon as any,
          customerCouponUsageCount: 0,
        }),
      ).toThrow(new BadRequestException('Mã giảm giá đã hết hạn hoặc chưa đến đợt áp dụng'));
    });

    it('should apply fixed amount discount without exceeding subtotal', () => {
      const fixedCoupon = {
        id: 'cpn-2',
        code: 'GIAM50K',
        discountType: 'FIXED_AMOUNT',
        discountValue: 50000,
        minOrderAmount: 100000,
        maxUsesPerCustomer: 2,
        startDate: new Date(Date.now() - 86400000),
        endDate: new Date(Date.now() + 86400000),
        isActive: true,
      };

      const res = pricingService.calculatePricing({
        items: [{ unitPrice: 200000, quantity: 1 }],
        coupon: fixedCoupon as any,
        customerCouponUsageCount: 1, // used 1 time, max is 2 -> allowed!
      });

      expect(res.discountAmount).toBe(50000);
      expect(res.totalAmount).toBe(180000); // 200k - 50k + 30k ship
    });
  });

  describe('Loyalty Points Redemption', () => {
    it('should redeem loyalty points at 1 point = 1,000 VND up to customer balance and order limit', () => {
      const items = [{ unitPrice: 300000, quantity: 1 }]; // subtotal 300k + 30k ship = 330k

      const res = pricingService.calculatePricing({
        items,
        pointsToUse: 50, // 50 points = 50,000 VND
        customerAvailablePoints: 100,
      });

      expect(res.pointsDiscount).toBe(50000);
      expect(res.totalAmount).toBe(280000); // 300k - 50k + 30k ship
    });

    it('should throw BadRequestException if customer requests more points than they possess', () => {
      const items = [{ unitPrice: 300000, quantity: 1 }];

      expect(() =>
        pricingService.calculatePricing({
          items,
          pointsToUse: 150,
          customerAvailablePoints: 100,
        }),
      ).toThrow(new BadRequestException('Số điểm thưởng sử dụng vượt quá số điểm hiện có của bạn'));
    });

    it('should cap points discount so total order value does not drop below 0', () => {
      const items = [{ unitPrice: 100000, quantity: 1 }];

      const res = pricingService.calculatePricing({
        items,
        pointsToUse: 200, // 200k
        customerAvailablePoints: 200,
      });

      // Subtotal is 100k, points discount is capped at subtotal (100k)
      expect(res.pointsDiscount).toBe(100000);
      expect(res.totalAmount).toBe(30000); // 100k - 100k + 30k ship
    });
  });
});
