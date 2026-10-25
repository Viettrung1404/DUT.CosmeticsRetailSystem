import {
  Injectable,
  Inject,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import {
  ORDER_REPOSITORY,
  IOrderRepository,
} from '../../domain/repositories/order.repository.interface';
import {
  OrderEntity,
  ShippingAddressVo,
} from '../../domain/entities/order.entity';
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
import { formatOrderNumber } from '../utils/order-number.util';
import { createVariantNameSnapshot } from '../utils/variant-name-snapshot.util';
import { allocateMoney } from '@modules/customer-commerce/domain/money';
import { Prisma } from '@prisma/client';

export interface CreateOrderItemRequest {
  variantId: string;
  quantity: number;
}

export interface CreateOrderInput {
  customerId: string;
  shippingAddress: ShippingAddressVo;
  paymentMethod?: string;
  items?: CreateOrderItemRequest[];
  couponCode?: string;
  usePoints?: number;
  storeId?: string;
  note?: string;
}

@Injectable()
export class CreateOrderUseCase {
  private readonly logger = new Logger(CreateOrderUseCase.name);

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

  async execute(input: CreateOrderInput): Promise<OrderEntity> {
    const {
      customerId,
      shippingAddress,
      paymentMethod = 'COD',
      couponCode,
      usePoints,
      storeId,
      note,
    } = input;

    // 1. Determine items to order
    let cartIdToClear: string | null = null;
    let itemsToOrder = input.items || [];

    if (itemsToOrder.length === 0) {
      const cart = await this.cartRepo.findCart({ customerId });
      if (!cart || !cart.items || cart.items.length === 0) {
        throw new BadRequestException('Giỏ hàng của bạn đang trống');
      }
      itemsToOrder = cart.items
        .filter((i) => i.isSelected !== false)
        .map((i) => ({
          variantId: i.productVariantId,
          quantity: i.quantity,
        }));
      cartIdToClear = cart.id;
    }

    if (
      !itemsToOrder.length ||
      new Set(itemsToOrder.map((i) => i.variantId)).size !== itemsToOrder.length
    ) {
      throw new BadRequestException('EMPTY_OR_DUPLICATE_ORDER_ITEMS');
    }

    // 2. Fetch Variant details
    const variantIds = itemsToOrder.map((i) => i.variantId);
    const variants = await this.catalogProvider.getVariantsDetails(variantIds);
    const variantMap = new Map(variants.map((v) => [v.id, v]));

    for (const item of itemsToOrder) {
      if (!variantMap.has(item.variantId)) {
        throw new BadRequestException(
          `Sản phẩm với biến thể ${item.variantId} không tồn tại`,
        );
      }
    }

    // 3. Resolve Store ID (Online vs Store Pickup)
    const resolvedStoreId = await this.storeResolver.resolveStoreForOrder({
      requestedStoreId: storeId,
      items: itemsToOrder,
    });

    // 4. Handle Coupon & Usage limit
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

    // 6. Pricing Calculation
    const pricingItems = itemsToOrder.map((item) => {
      const variant = variantMap.get(item.variantId)!;
      return {
        unitPrice: variant.unitPrice,
        quantity: item.quantity,
      };
    });

    const pointsValueVnd = usePoints
      ? await this.pricingService.configuredPointValue()
      : 0;
    const pricing = this.pricingService.calculatePricing({
      items: pricingItems,
      coupon,
      customerCouponUsageCount,
      pointsToUse: usePoints,
      customerAvailablePoints: customerPoints,
      pointsValueVnd,
      customerId,
    });

    // 7. Format Order Number: ORDYYYYMMDDXXXX
    const now = new Date();
    const nextSeq = await this.orderRepo.getNextOrderSequence(now);
    const orderNumber = formatOrderNumber(now, nextSeq);

    // 8. Prepare snapshot items
    const weights = pricingItems.map((item) => item.unitPrice * item.quantity);
    const couponShares = allocateMoney(pricing.discountAmount, weights);
    const pointsShares = allocateMoney(
      pricing.pointsDiscount,
      weights.map((weight, index) =>
        new Prisma.Decimal(weight).minus(couponShares[index]),
      ),
    );
    const pointsUsed = pointsValueVnd
      ? Math.round(pricing.pointsDiscount / pointsValueVnd)
      : 0;
    const pointUnits = allocateMoney(pointsUsed / 100, pointsShares).map((n) =>
      Math.round(n * 100),
    );
    const snapshotItems = itemsToOrder.map((item, index) => {
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
        unitCost: variant.unitCost,
        discountAmount: couponShares[index] + pointsShares[index],
        totalPrice: new Prisma.Decimal(variant.unitPrice)
          .mul(item.quantity)
          .minus(couponShares[index])
          .minus(pointsShares[index])
          .toNumber(),
        pricingSnapshot: {
          version: 1,
          cashValue: new Prisma.Decimal(variant.unitPrice)
            .mul(item.quantity)
            .minus(couponShares[index])
            .minus(pointsShares[index])
            .toNumber(),
          couponDiscount: couponShares[index],
          pointsValue: pointsShares[index],
          pointsUsed: pointUnits[index],
        },
      };
    });

    // 9. Execute Transaction via Repository
    const createdOrder = await this.orderRepo.createOrderWithTransaction({
      orderNumber,
      customerId,
      storeId: resolvedStoreId,
      orderType: storeId ? 'STORE_PICKUP' : 'ONLINE',
      subtotal: pricing.subtotal,
      discountAmount: pricing.discountAmount + pricing.pointsDiscount,
      shippingFee: pricing.shippingFee,
      taxAmount: 0,
      totalAmount: pricing.totalAmount,
      shippingAddress,
      note,
      couponId: coupon ? coupon.id : null,
      loyaltyPointsUsed: pointsUsed,
      couponDiscount: pricing.discountAmount,
      pointsDiscount: pricing.pointsDiscount,
      pointsValueVnd,
      cartId: cartIdToClear ?? undefined,
      pricingSnapshot: {
        version: 1,
        couponDiscount: pricing.discountAmount,
        pointsDiscount: pricing.pointsDiscount,
        pointsValueVnd,
      },
      paymentMethod,
      items: snapshotItems,
    });

    // Purchased cart rows are removed by the repository in the order transaction.

    this.logger.log(
      `[ORDER_CREATED] Order ${orderNumber} created with durable notification.`,
    );

    return createdOrder;
  }
}
