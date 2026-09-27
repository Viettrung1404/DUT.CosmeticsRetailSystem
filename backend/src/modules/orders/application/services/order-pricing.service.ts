import { Injectable, BadRequestException } from '@nestjs/common';

export interface PricingItemInput {
  unitPrice: number;
  quantity: number;
}

export interface CouponInput {
  id: string;
  code: string;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue: number;
  minOrderAmount?: number | null;
  maxDiscountAmount?: number | null;
  maxUses?: number | null;
  usedCount?: number;
  maxUsesPerCustomer?: number | null;
  startDate?: Date | null;
  endDate?: Date | null;
  isActive: boolean;
}

export interface CalculatePricingInput {
  items: PricingItemInput[];
  coupon?: CouponInput | null;
  customerCouponUsageCount?: number;
  pointsToUse?: number;
  customerAvailablePoints?: number;
}

export interface OrderPricingResult {
  subtotal: number;
  shippingFee: number;
  discountAmount: number;
  pointsDiscount: number;
  totalAmount: number;
}

@Injectable()
export class OrderPricingService {
  private readonly FREE_SHIPPING_THRESHOLD = 500000;
  private readonly STANDARD_SHIPPING_FEE = 30000;
  private readonly POINT_RATE_VND = 1000;

  calculatePricing(input: CalculatePricingInput): OrderPricingResult {
    // 1. Calculate Subtotal
    const subtotal = input.items.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0,
    );

    // 2. Calculate Shipping Fee
    const shippingFee =
      subtotal >= this.FREE_SHIPPING_THRESHOLD ? 0 : this.STANDARD_SHIPPING_FEE;

    // 3. Calculate Coupon Discount
    let discountAmount = 0;
    if (input.coupon) {
      discountAmount = this.validateAndCalculateCouponDiscount(
        input.coupon,
        subtotal,
        input.customerCouponUsageCount ?? 0,
      );
    }

    // 4. Calculate Points Discount
    let pointsDiscount = 0;
    if (input.pointsToUse && input.pointsToUse > 0) {
      pointsDiscount = this.validateAndCalculatePointsDiscount(
        input.pointsToUse,
        input.customerAvailablePoints ?? 0,
        subtotal - discountAmount,
      );
    }

    // 5. Total Amount
    const totalAmount = subtotal - discountAmount - pointsDiscount + shippingFee;

    return {
      subtotal,
      shippingFee,
      discountAmount,
      pointsDiscount,
      totalAmount,
    };
  }

  private validateAndCalculateCouponDiscount(
    coupon: CouponInput,
    subtotal: number,
    customerUsageCount: number,
  ): number {
    const now = new Date();

    if (!coupon.isActive) {
      throw new BadRequestException('Mã giảm giá đã hết hạn hoặc chưa đến đợt áp dụng');
    }

    if (coupon.startDate && now < new Date(coupon.startDate)) {
      throw new BadRequestException('Mã giảm giá đã hết hạn hoặc chưa đến đợt áp dụng');
    }

    if (coupon.endDate && now > new Date(coupon.endDate)) {
      throw new BadRequestException('Mã giảm giá đã hết hạn hoặc chưa đến đợt áp dụng');
    }

    const maxPerCustomer = coupon.maxUsesPerCustomer ?? 1;
    if (customerUsageCount >= maxPerCustomer) {
      throw new BadRequestException('Bạn đã sử dụng hết lượt cho mã giảm giá này');
    }

    if (coupon.minOrderAmount && subtotal < coupon.minOrderAmount) {
      throw new BadRequestException(
        'Đơn hàng chưa đạt giá trị tối thiểu để áp dụng mã giảm giá này',
      );
    }

    let discount = 0;
    if (coupon.discountType === 'PERCENTAGE') {
      discount = Math.round((subtotal * coupon.discountValue) / 100);
      if (coupon.maxDiscountAmount && discount > coupon.maxDiscountAmount) {
        discount = coupon.maxDiscountAmount;
      }
    } else if (coupon.discountType === 'FIXED_AMOUNT') {
      discount = coupon.discountValue;
    }

    return Math.min(discount, subtotal);
  }

  private validateAndCalculatePointsDiscount(
    pointsToUse: number,
    availablePoints: number,
    maxAllowedDiscount: number,
  ): number {
    if (pointsToUse > availablePoints) {
      throw new BadRequestException(
        'Số điểm thưởng sử dụng vượt quá số điểm hiện có của bạn',
      );
    }

    const rawDiscount = pointsToUse * this.POINT_RATE_VND;
    return Math.min(rawDiscount, Math.max(0, maxAllowedDiscount));
  }
}
