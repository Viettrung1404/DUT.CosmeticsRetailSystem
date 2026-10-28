import {
  Injectable,
  BadRequestException,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { Prisma } from '@prisma/client';
import { calculatePointsRedemption } from '@core/utils/loyalty-policy.util';

export interface PricingItemInput {
  unitPrice: number;
  quantity: number;
}

export interface CouponInput {
  id: string;
  code: string;
  discountType: 'PERCENTAGE' | 'FIXED' | 'FIXED_AMOUNT';
  discountValue: number;
  minOrderAmount?: number | null;
  maxDiscountAmount?: number | null;
  maxUses?: number | null;
  usedCount?: number;
  maxUsesPerCustomer?: number | null;
  startDate?: Date | null;
  endDate?: Date | null;
  isActive: boolean;
  customerId?: string | null;
}

export interface CalculatePricingInput {
  items: PricingItemInput[];
  coupon?: CouponInput | null;
  customerCouponUsageCount?: number;
  pointsToUse?: number;
  customerAvailablePoints?: number;
  pointsValueVnd?: number;
  customerId?: string;
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
  constructor(@Optional() private readonly prisma?: PrismaService) {}
  async configuredPointValue(): Promise<number> {
    const row = await this.prisma?.setting.findUnique({
      where: { key: 'loyalty_config' },
    });
    const value = (row?.value as { point_value_vnd?: unknown } | null)
      ?.point_value_vnd;
    if (
      typeof value !== 'number' ||
      !Number.isSafeInteger(value) ||
      value <= 0
    ) {
      throw new ServiceUnavailableException('POINT_VALUE_NOT_CONFIGURED');
    }
    return value;
  }
  private readonly FREE_SHIPPING_THRESHOLD = 500000;
  private readonly STANDARD_SHIPPING_FEE = 30000;

  calculatePricing(input: CalculatePricingInput): OrderPricingResult {
    if (
      input.pointsToUse !== undefined &&
      (!Number.isSafeInteger(input.pointsToUse) || input.pointsToUse < 0)
    ) {
      throw new BadRequestException('INVALID_POINTS');
    }
    // 1. Calculate Subtotal
    const subtotal = input.items
      .reduce(
        (sum, item) =>
          sum.add(new Prisma.Decimal(item.unitPrice).mul(item.quantity)),
        new Prisma.Decimal(0),
      )
      .toNumber();

    // 2. Calculate Shipping Fee
    const shippingFee =
      subtotal >= this.FREE_SHIPPING_THRESHOLD ? 0 : this.STANDARD_SHIPPING_FEE;

    // 3. Calculate Coupon Discount
    let discountAmount = 0;
    if (input.coupon) {
      if (
        input.coupon.customerId &&
        input.coupon.customerId !== input.customerId
      )
        throw new BadRequestException('COUPON_NOT_AVAILABLE');
      discountAmount = this.validateAndCalculateCouponDiscount(
        input.coupon,
        subtotal,
        input.customerCouponUsageCount ?? 0,
      );
    }

    // 4. Calculate Points Discount
    let pointsDiscount = 0;
    if (input.pointsToUse && input.pointsToUse > 0) {
      pointsDiscount = calculatePointsRedemption(
        input.pointsToUse,
        input.customerAvailablePoints ?? 0,
        subtotal - discountAmount,
      );
    }

    // 5. Total Amount
    const totalAmount = new Prisma.Decimal(subtotal)
      .minus(discountAmount)
      .minus(pointsDiscount)
      .add(shippingFee)
      .toNumber();

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
      throw new BadRequestException(
        'Mã giảm giá đã hết hạn hoặc chưa đến đợt áp dụng',
      );
    }

    if (coupon.startDate && now < new Date(coupon.startDate)) {
      throw new BadRequestException(
        'Mã giảm giá đã hết hạn hoặc chưa đến đợt áp dụng',
      );
    }

    if (coupon.endDate && now > new Date(coupon.endDate)) {
      throw new BadRequestException(
        'Mã giảm giá đã hết hạn hoặc chưa đến đợt áp dụng',
      );
    }

    const maxPerCustomer = coupon.maxUsesPerCustomer ?? 1;
    if (
      coupon.maxUses !== null &&
      coupon.maxUses !== undefined &&
      (coupon.usedCount ?? 0) >= coupon.maxUses
    ) {
      throw new BadRequestException('COUPON_EXHAUSTED');
    }
    if (customerUsageCount >= maxPerCustomer) {
      throw new BadRequestException(
        'Bạn đã sử dụng hết lượt cho mã giảm giá này',
      );
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
    } else if (coupon.discountType === 'FIXED' || coupon.discountType === 'FIXED_AMOUNT') {
      discount = coupon.discountValue;
    } else {
      throw new BadRequestException('INVALID_COUPON_TYPE');
    }

    return Math.min(discount, subtotal);
  }
}
