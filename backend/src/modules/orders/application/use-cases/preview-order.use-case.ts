import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import {
  ORDER_REPOSITORY,
  IOrderRepository,
} from '../../domain/repositories/order.repository.interface';
import { OrderPricingService } from '../services/order-pricing.service';
import { StoreResolverService } from '../services/store-resolver.service';
import {
  VARIANT_CATALOG_PROVIDER,
  IVariantCatalogProvider,
} from '../ports/variant-catalog.provider';
import {
  CART_REPOSITORY,
  ICartRepository,
} from '../../../cart/domain/repositories/cart.repository.interface';
import { createVariantNameSnapshot } from '../utils/variant-name-snapshot.util';

export interface PreviewOrderItemInput {
  variantId: string;
  quantity: number;
}

export interface PreviewOrderInput {
  customerId: string;
  items?: PreviewOrderItemInput[];
  couponCode?: string;
  usePoints?: number;
  storeId?: string;
}

export interface PreviewOrderItemResult {
  productVariantId: string;
  productName: string;
  variantName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface PreviewOrderResult {
  subtotal: number;
  shippingFee: number;
  discountAmount: number;
  pointsDiscount: number;
  totalAmount: number;
  storeId: string;
  items: PreviewOrderItemResult[];
}

@Injectable()
export class PreviewOrderUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepo: IOrderRepository,
    private readonly pricingService: OrderPricingService,
    private readonly storeResolver: StoreResolverService,
    @Inject(VARIANT_CATALOG_PROVIDER)
    private readonly catalogProvider: IVariantCatalogProvider,
    @Inject(CART_REPOSITORY)
    private readonly cartRepo: ICartRepository,
  ) {}

  async execute(input: PreviewOrderInput): Promise<PreviewOrderResult> {
    const { customerId, couponCode, usePoints, storeId } = input;

    // 1. Determine items from input or cart
    let requestedItems: PreviewOrderItemInput[] = input.items || [];
    if (requestedItems.length === 0) {
      const cart = await this.cartRepo.findCart({ customerId });
      if (!cart || !cart.items || cart.items.length === 0) {
        throw new BadRequestException('Giỏ hàng của bạn đang trống');
      }
      requestedItems = cart.items.map((i) => ({
        variantId: i.productVariantId,
        quantity: i.quantity,
      }));
    }

    // 2. Fetch Variant details
    const variantIds = requestedItems.map((i) => i.variantId);
    const variants = await this.catalogProvider.getVariantsDetails(variantIds);
    const variantMap = new Map(variants.map((v) => [v.id, v]));

    for (const item of requestedItems) {
      if (!variantMap.has(item.variantId)) {
        throw new BadRequestException(
          `Sản phẩm với biến thể ${item.variantId} không tồn tại`,
        );
      }
    }

    // 3. Resolve Store ID
    const resolvedStoreId = await this.storeResolver.resolveStoreForOrder({
      requestedStoreId: storeId,
      items: requestedItems,
    });

    // 4. Handle Coupon
    let coupon: any = null;
    let customerCouponUsageCount = 0;
    if (couponCode) {
      coupon = await this.orderRepo.findCouponByCode(couponCode);
      if (!coupon) {
        throw new BadRequestException('Mã giảm giá không tồn tại');
      }
      customerCouponUsageCount =
        await this.orderRepo.getCustomerCouponUsageCount(customerId, coupon.id);
    }

    // 5. Handle Loyalty Points
    const customerPoints = await this.orderRepo.getCustomerPoints(customerId);

    // 6. Calculate Pricing
    const pricingItems = requestedItems.map((item) => {
      const variant = variantMap.get(item.variantId)!;
      return {
        unitPrice: variant.unitPrice,
        quantity: item.quantity,
      };
    });

    const pricing = this.pricingService.calculatePricing({
      items: pricingItems,
      coupon,
      customerCouponUsageCount,
      pointsToUse: usePoints,
      customerAvailablePoints: customerPoints,
    });

    // 7. Map Items with Snapshot
    const itemResults: PreviewOrderItemResult[] = requestedItems.map((item) => {
      const variant = variantMap.get(item.variantId)!;
      const variantName = createVariantNameSnapshot({
        option1Value: variant.option1Value,
        option2Value: variant.option2Value,
        option3Value: variant.option3Value,
        sku: variant.sku,
      });

      return {
        productVariantId: variant.id,
        productName: variant.productName,
        variantName,
        quantity: item.quantity,
        unitPrice: variant.unitPrice,
        totalPrice: variant.unitPrice * item.quantity,
      };
    });

    return {
      subtotal: pricing.subtotal,
      shippingFee: pricing.shippingFee,
      discountAmount: pricing.discountAmount,
      pointsDiscount: pricing.pointsDiscount,
      totalAmount: pricing.totalAmount,
      storeId: resolvedStoreId,
      items: itemResults,
    };
  }
}
