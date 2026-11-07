import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  PosPricing,
  PosSaleContext,
  PosStockShortage,
} from '../../domain/entities/pos-sale.entity';
import {
  IPosOrderRepository,
  POS_ORDER_REPOSITORY,
} from '../../domain/repositories/pos-order.repository.interface';
import { buildPosPricing } from '../utils/pos-pricing.util';
import { PosStoreAccessService } from './pos-store-access.service';

export interface PosSaleInput {
  storeId: string;
  items: Array<{ variantId: string; quantity: number }>;
  customerId?: string;
  couponCode?: string;
  pointsToUse?: number;
}

export interface PosSalePlan {
  context: PosSaleContext;
  pricing: PosPricing;
  shortages: PosStockShortage[];
  promotionIds: string[];
}

@Injectable()
export class PosSalePlanner {
  constructor(
    @Inject(POS_ORDER_REPOSITORY)
    private readonly repository: IPosOrderRepository,
    private readonly storeAccess: PosStoreAccessService,
  ) {}

  async plan(
    userId: string,
    permissionCodes: string[],
    input: PosSaleInput,
    now: Date = new Date(),
  ): Promise<PosSalePlan> {
    await this.storeAccess.assertCanSell(userId, input.storeId);

    const couponCode = input.couponCode?.trim() || null;
    const pointsToUse = input.pointsToUse ?? 0;
    if (couponCode && !permissionCodes.includes('ORDER_DISCOUNT_APPLY')) {
      throw new ForbiddenException('Bạn không có quyền áp dụng mã giảm giá tại quầy');
    }
    if ((couponCode || pointsToUse > 0) && !input.customerId) {
      throw new BadRequestException('Cần chọn khách hàng để dùng mã giảm giá hoặc điểm thưởng');
    }

    // Cùng một biến thể quét nhiều lần thì gộp thành một dòng
    const quantities = new Map<string, number>();
    for (const item of input.items) {
      quantities.set(item.variantId, (quantities.get(item.variantId) ?? 0) + item.quantity);
    }

    const context = await this.repository.loadSaleContext({
      storeId: input.storeId,
      cashierUserId: userId,
      variantIds: [...quantities.keys()],
      customerId: input.customerId ?? null,
      couponCode,
      now,
    });

    if (input.customerId && !context.customer) {
      throw new NotFoundException('Không tìm thấy khách hàng');
    }
    if (couponCode && !context.coupon) {
      throw new BadRequestException('Mã giảm giá không tồn tại');
    }

    const lines = [...quantities.entries()].map(([variantId, quantity]) => {
      const variant = context.variants.find((v) => v.variantId === variantId);
      if (!variant) {
        throw new BadRequestException('Có sản phẩm trong giỏ không tồn tại');
      }
      if (!variant.isActive || !variant.productActive) {
        throw new BadRequestException(`Sản phẩm ${variant.productName} đã ngừng bán`);
      }
      return { variant, quantity };
    });

    const pricing = buildPosPricing({
      lines,
      promotions: context.promotions,
      coupon: context.coupon,
      couponUsageCount: context.couponUsageCount,
      customerId: context.customer?.id ?? null,
      pointsToUse,
      availablePoints: context.customer?.totalPoints ?? 0,
      now,
    });

    const shortages: PosStockShortage[] = [];
    for (const { variant, quantity } of lines) {
      const sellable = Math.max(0, variant.onHand - variant.reserved - variant.expiredQuantity);
      if (sellable < quantity) {
        shortages.push({
          variantId: variant.variantId,
          productName: variant.productName,
          variantName: variant.variantName,
          requested: quantity,
          sellable,
        });
      }
    }

    const promotionIds = [
      ...new Set(pricing.lines.map((l) => l.promotionId).filter((id): id is string => !!id)),
    ];
    return { context, pricing, shortages, promotionIds };
  }
}
