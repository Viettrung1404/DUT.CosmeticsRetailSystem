import {
  BadRequestException,
  ConflictException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { Prisma } from '@prisma/client';
import {
  CustomerCommands,
  json,
} from '@modules/customer-commerce/infrastructure/commands';
import { CommercePricingService } from '@modules/customer-experience/application/commerce-pricing.service';
import { notifyCustomer } from '@core/services/customer-events';
import { evaluateTier } from '@modules/customer-commerce/application/loyalty.service';
import { CreateOrderInput } from '../use-cases/create-order.use-case';
import { PreviewOrderInput } from '../use-cases/preview-order.use-case';
import { StoreResolverService } from './store-resolver.service';
import { OrderEntity } from '../../domain/entities/order.entity';
import { OrderStatus } from '@core/domain/orders/order-status.enum';
import { reservePromotionBenefits } from '@core/services/promotion-lifecycle';
import { formatOrderNumber } from '../utils/order-number.util';
import { createVariantNameSnapshot } from '../utils/variant-name-snapshot.util';

@Injectable()
export class CommerceCheckoutService {
  constructor(
    private readonly db: PrismaService,
    private readonly pricing: CommercePricingService,
    private readonly commands: CustomerCommands,
    private readonly stores: StoreResolverService,
  ) {}
  private async selection(
    input: PreviewOrderInput,
    tx: Prisma.TransactionClient = this.db,
  ) {
    if (input.items?.length) return { items: input.items, cartId: null };
    const cart = await tx.cart.findFirst({
      where: { customerId: input.customerId },
      include: {
        items: { where: { isSelected: true }, orderBy: { id: 'asc' } },
      },
    });
    if (!cart?.items.length) throw new BadRequestException('CART_EMPTY');
    return {
      items: cart.items.map((i) => ({
        variantId: i.productVariantId,
        quantity: i.quantity,
      })),
      cartId: cart.id,
    };
  }
  async preview(input: PreviewOrderInput) {
    const selection = await this.selection(input);
    const storeId = await this.stores.resolveStoreForOrder({
      requestedStoreId: input.storeId,
      items: selection.items,
    });
    const quote = await this.pricing.quote({
      ...input,
      items: selection.items,
    });
    const { variants, ...publicQuote } = quote;
    return {
      ...publicQuote,
      storeId,
      discountAmount: quote.lineDiscount + quote.couponDiscount,
      items: quote.items.map((line) => ({
        ...line,
        productVariantId: line.variantId,
        productName: variants.find((v) => v.id === line.variantId)!.product
          .name,
        variantName: createVariantNameSnapshot(
          variants.find((v) => v.id === line.variantId)!,
        ),
        totalPrice: line.cashValue,
      })),
    };
  }
  async create(input: CreateOrderInput): Promise<OrderEntity> {
    if (!['COD'].includes(input.paymentMethod ?? 'COD'))
      throw new ServiceUnavailableException('ONLINE_PAYMENT_MODULE_REQUIRED');
    const owner = await this.db.customer.findUniqueOrThrow({
      where: { id: input.customerId },
      select: { userId: true },
    });
    if (!owner.userId) throw new BadRequestException('CUSTOMER_REQUIRED');
    return this.commands.execute(
      owner.userId,
      'CHECKOUT',
      input.idempotencyKey ?? '',
      input,
      async (tx, customerId) => {
        if (customerId !== input.customerId)
          throw new BadRequestException('CUSTOMER_REQUIRED');
        const selection = await this.selection(input, tx);
        const storeId = await this.stores.resolveStoreForOrder({
          requestedStoreId: input.storeId,
          items: selection.items,
        });
        const quote = await this.pricing.quote(
          { ...input, items: selection.items },
          tx,
          true,
        );
        if (!input.quoteVersion)
          throw new BadRequestException('PRICE_QUOTE_REQUIRED');
        this.pricing.assertQuote(input.quoteVersion, quote);
        const variantIds = selection.items.map((i) => i.variantId);
        const inventory = await tx.$queryRaw<
          {
            id: string;
            product_variant_id: string;
            quantity: number;
            reserved_quantity: number;
          }[]
        >`SELECT id,product_variant_id,quantity,reserved_quantity FROM inventory WHERE store_id=${storeId}::uuid AND product_variant_id=ANY(${variantIds}::uuid[]) ORDER BY id FOR UPDATE`;
        for (const item of selection.items) {
          const row = inventory.find(
            (i) => i.product_variant_id === item.variantId,
          );
          if (!row || row.quantity - row.reserved_quantity < item.quantity)
            throw new ConflictException('INSUFFICIENT_STOCK');
          await tx.inventory.update({
            where: { id: row.id },
            data: { reservedQuantity: { increment: item.quantity } },
          });
        }
        const [sequence] = await tx.$queryRaw<
          { value: bigint }[]
        >`SELECT nextval('customer_order_seq') AS value`;
        const orderNumber = formatOrderNumber(
          new Date(),
          Number(sequence.value),
        );
        const order = await tx.order.create({
          data: {
            orderNumber,
            customerId,
            storeId,
            orderType: input.storeId ? 'STORE_PICKUP' : 'ONLINE',
            status: 'PENDING',
            subtotal: quote.subtotal,
            discountAmount:
              quote.lineDiscount + quote.couponDiscount + quote.pointsDiscount,
            shippingFee: quote.shippingFee,
            taxAmount: 0,
            totalAmount: quote.totalAmount,
            shippingAddress: json(input.shippingAddress),
            note: input.note,
            couponId: quote.couponId,
            loyaltyPointsUsed: quote.pointsUsed,
            pricingSnapshot: json({
              version: 1,
              policy: 'SPRINT5',
              quoteVersion: quote.quoteVersion,
              lineDiscount: quote.lineDiscount,
              couponDiscount: quote.couponDiscount,
              pointsDiscount: quote.pointsDiscount,
              pointsValueVnd: quote.pointValue,
              shippingFee: quote.shippingFee,
              taxAmount: 0,
            }),
          },
        });
        for (const line of quote.items) {
          const variant = quote.variants.find((v) => v.id === line.variantId)!;
          const item = await tx.orderItem.create({
            data: {
              orderId: order.id,
              productVariantId: line.variantId,
              promotionId: line.promotionId,
              productName: variant.product.name,
              variantName: createVariantNameSnapshot(variant),
              quantity: line.quantity,
              unitPrice: line.originalPrice,
              unitCost: variant.costPrice,
              discountAmount:
                line.lineDiscount + line.couponDiscount + line.pointsValue,
              totalPrice: line.cashValue,
              pricingSnapshot: json({ version: 1, policy: 'SPRINT5', ...line }),
            },
          });
        }
        const promotionIds = [
          ...new Set([
            ...quote.items.flatMap((i) =>
              i.promotionId ? [i.promotionId] : [],
            ),
            ...(quote.shippingPromotionId ? [quote.shippingPromotionId] : []),
            ...(quote.couponId
              ? [
                  await tx.coupon
                    .findUniqueOrThrow({
                      where: { id: quote.couponId },
                      select: { promotionId: true },
                    })
                    .then((c) => c.promotionId),
                ].filter((id): id is string => !!id)
              : []),
          ]),
        ].sort();
        await reservePromotionBenefits(tx, order.id, quote.items, promotionIds);
        if (quote.couponId) {
          await tx.couponUsage.create({
            data: {
              couponId: quote.couponId,
              customerId,
              orderId: order.id,
              discountAmount: quote.couponDiscount,
            },
          });
          await tx.coupon.update({
            where: { id: quote.couponId },
            data: { usedCount: { increment: 1 } },
          });
        }
        if (quote.pointsUsed) {
          await tx.customer.update({
            where: { id: customerId },
            data: { totalPoints: { decrement: quote.pointsUsed } },
          });
          await tx.loyaltyPointsTransaction.create({
            data: {
              customerId,
              orderId: order.id,
              points: -quote.pointsUsed,
              type: 'REDEEM',
              eventKey: `ORDER:${order.id}:REDEEM`,
            },
          });
          await evaluateTier(tx, customerId);
        }
        if (selection.cartId) {
          await tx.$queryRaw`SELECT id FROM cart_items WHERE cart_id=${selection.cartId}::uuid ORDER BY id FOR UPDATE`;
          for (const line of selection.items) {
            const removed = await tx.cartItem.deleteMany({
              where: {
                cartId: selection.cartId,
                productVariantId: line.variantId,
                quantity: line.quantity,
                isSelected: true,
              },
            });
            if (removed.count !== 1)
              throw new ConflictException('CART_CHANGED');
          }
        }
        await tx.payment.create({
          data: {
            orderId: order.id,
            paymentMethod: 'COD',
            status: 'PENDING',
            amount: order.totalAmount,
          },
        });
        await tx.orderStatusHistory.create({
          data: {
            orderId: order.id,
            status: 'PENDING',
            note: 'Đơn hàng được khởi tạo thành công',
          },
        });
        await notifyCustomer(
          tx,
          customerId,
          `ORDER:${order.id}:PENDING`,
          'Đã nhận đơn hàng',
          'ORDER',
          { orderId: order.id },
        );
        const items = await tx.orderItem.findMany({
          where: { orderId: order.id },
          orderBy: { id: 'asc' },
          select: {
            id: true,
            orderId: true,
            productVariantId: true,
            productName: true,
            variantName: true,
            quantity: true,
            unitPrice: true,
            discountAmount: true,
            totalPrice: true,
          },
        });
        return new OrderEntity({
          ...order,
          status: OrderStatus.PENDING,
          shippingAddress: input.shippingAddress,
          subtotal: Number(order.subtotal),
          discountAmount: Number(order.discountAmount),
          shippingFee: Number(order.shippingFee),
          taxAmount: 0,
          totalAmount: Number(order.totalAmount),
          items: items.map((item) => ({
            ...item,
            unitPrice: Number(item.unitPrice),
            discountAmount: Number(item.discountAmount),
            totalPrice: Number(item.totalPrice),
          })) as OrderEntity['items'],
        });
      },
    );
  }
}
