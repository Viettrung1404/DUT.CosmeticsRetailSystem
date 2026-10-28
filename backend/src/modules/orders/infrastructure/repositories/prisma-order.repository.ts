import { validatePaymentAmount } from '@modules/payments/domain/payment-policy';
import { assertGatewayReady } from '@modules/payments/domain/gateway-readiness';
import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { OrderPricingService } from '../../application/services/order-pricing.service';
import { notifyCustomer } from '@core/services/customer-events';
import { evaluateTier } from '@modules/customer-commerce/application/loyalty.service';
import { transitionPromotionAllocations } from '@core/services/promotion-lifecycle';
import { cancelReplacementCredit } from '@modules/customer-commerce/application/admin-integration.service';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import {
  IOrderRepository,
  CreateOrderTransactionInput,
} from '../../domain/repositories/order.repository.interface';
import {
  OrderEntity,
  ShippingAddressVo,
} from '../../domain/entities/order.entity';
import { OrderItemEntity } from '../../domain/entities/order-item.entity';
import {
  OrderStatus,
  OrderActor,
} from '../../../../core/domain/orders/order-status.enum';
import { OrderStateMachine } from '../../../../core/domain/orders/order-state-machine';

@Injectable()
export class PrismaOrderRepository implements IOrderRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createOrderWithTransaction(
    data: CreateOrderTransactionInput,
  ): Promise<OrderEntity> {
    validatePaymentAmount(data.paymentMethod, data.totalAmount);
    assertGatewayReady(data.paymentMethod);
    return this.prisma.transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM customers WHERE id=${data.customerId}::uuid FOR UPDATE`;
        const customer = await tx.customer.findUniqueOrThrow({
          where: { id: data.customerId },
        });
        if (data.couponId)
          await tx.$queryRaw`SELECT id FROM coupons WHERE id=${data.couponId}::uuid FOR UPDATE`;
        const coupon = data.couponId
          ? await tx.coupon.findUniqueOrThrow({ where: { id: data.couponId } })
          : null;
        if (
          coupon &&
          ((coupon.customerId && coupon.customerId !== data.customerId) ||
            (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses))
        )
          throw new ConflictException('COUPON_NOT_AVAILABLE');
        const usage = coupon
          ? await tx.couponUsage.count({
              where: { couponId: coupon.id, customerId: data.customerId },
            })
          : 0;
        if (data.loyaltyPointsUsed > 0) {
          const setting = await tx.setting.findUnique({
            where: { key: 'loyalty_config' },
          });
          if ((setting?.value as any)?.point_value_vnd !== data.pointsValueVnd)
            throw new ConflictException('POINT_POLICY_CHANGED');
        }
        const variantIds = data.items.map((item) => item.productVariantId);
        await tx.$queryRaw`SELECT v.id FROM product_variants v JOIN products p ON p.id=v.product_id
        WHERE v.id=ANY(${variantIds}::uuid[]) ORDER BY v.id FOR SHARE OF v,p`;
        const variants = await tx.productVariant.findMany({
          where: {
            id: { in: variantIds },
            isActive: true,
            product: { isActive: true },
          },
        });
        if (
          variants.length !== data.items.length ||
          data.items.some(
            (item) =>
              !variants.some(
                (v) =>
                  v.id === item.productVariantId &&
                  Number(v.price) === item.unitPrice,
              ),
          )
        ) {
          throw new ConflictException('ORDER_PRICE_CHANGED');
        }
        const fresh = new OrderPricingService().calculatePricing({
          items: data.items,
          coupon: coupon
            ? {
                ...coupon,
                discountValue: Number(coupon.discountValue),
                minOrderAmount: Number(coupon.minOrderAmount),
                maxDiscountAmount: coupon.maxDiscountAmount === null ? null : Number(coupon.maxDiscountAmount),
                discountType:
                  coupon.discountType === 'FIXED'
                    ? 'FIXED_AMOUNT'
                    : (coupon.discountType as 'PERCENTAGE' | 'FIXED_AMOUNT'),
              }
            : null,
          customerCouponUsageCount: usage,
          pointsToUse: data.loyaltyPointsUsed,
          customerAvailablePoints: customer.totalPoints,
          pointsValueVnd: data.pointsValueVnd,
          customerId: data.customerId,
        });
        if (
          fresh.totalAmount !== data.totalAmount ||
          fresh.discountAmount !== (data.couponDiscount ?? 0) ||
          fresh.pointsDiscount !== (data.pointsDiscount ?? 0)
        )
          throw new ConflictException('ORDER_PRICE_CHANGED');
        await tx.$queryRaw`SELECT id FROM inventory WHERE store_id=${data.storeId}::uuid
        AND product_variant_id=ANY(${variantIds}::uuid[]) ORDER BY id FOR UPDATE`;
        // 1. Pessimistic Row Lock (SELECT ... FOR UPDATE) on inventory rows to prevent race condition
        for (const item of data.items) {
          const inventories = await tx.$queryRaw<
            Array<{ id: string; quantity: number; reserved_quantity: number }>
          >`
          SELECT id, quantity, reserved_quantity 
          FROM inventory 
          WHERE store_id = ${data.storeId}::uuid 
            AND product_variant_id = ${item.productVariantId}::uuid 
          FOR UPDATE;
        `;

          if (!inventories || inventories.length === 0) {
            throw new BadRequestException(
              `Sản phẩm ${item.productName} chưa được cấu hình tồn kho tại chi nhánh này`,
            );
          }

          const inv = inventories[0];
          const available = inv.quantity - inv.reserved_quantity;
          if (available < item.quantity) {
            throw new BadRequestException(
              `Sản phẩm ${item.productName} - ${item.variantName} không đủ tồn kho (còn ${available}, yêu cầu ${item.quantity})`,
            );
          }

          await tx.inventory.update({
            where: { id: inv.id },
            data: {
              reservedQuantity: {
                increment: item.quantity,
              },
            },
          });
        }

        // 2. Create Order record with OrderStatus.PENDING
        const order = await tx.order.create({
          data: {
            orderNumber: data.orderNumber,
            customerId: data.customerId,
            storeId: data.storeId,
            orderType: data.orderType,
            status: OrderStatus.PENDING,
            subtotal: data.subtotal,
            discountAmount: data.discountAmount,
            shippingFee: data.shippingFee,
            taxAmount: data.taxAmount,
            totalAmount: data.totalAmount,
            shippingAddress: data.shippingAddress as any,
            note: data.note,
            couponId: data.couponId,
            loyaltyPointsUsed: data.loyaltyPointsUsed,
            pricingSnapshot: data.pricingSnapshot as Prisma.InputJsonValue,
          },
        });

        // 3. Create OrderItems
        await tx.orderItem.createMany({
          data: data.items.map((item) => ({
            orderId: order.id,
            productVariantId: item.productVariantId,
            productName: item.productName,
            variantName: item.variantName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            unitCost: variants.find((v) => v.id === item.productVariantId)!
              .costPrice,
            discountAmount: item.discountAmount,
            totalPrice: item.totalPrice,
            pricingSnapshot: item.pricingSnapshot as Prisma.InputJsonValue,
          })),
        });

        // 4. Handle Coupon Usage
        if (data.couponId) {
          await tx.couponUsage.create({
            data: {
              couponId: data.couponId,
              customerId: data.customerId,
              orderId: order.id,
              discountAmount: data.couponDiscount ?? 0,
            },
          });

          await tx.coupon.update({
            where: { id: data.couponId },
            data: {
              usedCount: { increment: 1 },
            },
          });
        }

        // 5. Handle Loyalty Points Deduction
        if (data.loyaltyPointsUsed > 0) {
          await tx.customer.update({
            where: { id: data.customerId },
            data: {
              totalPoints: { decrement: data.loyaltyPointsUsed },
            },
          });

          await tx.loyaltyPointsTransaction.create({
            data: {
              customerId: data.customerId,
              orderId: order.id,
              points: -data.loyaltyPointsUsed,
              type: 'REDEEM',
              eventKey: `ORDER:${order.id}:REDEEM`,
              description: `Sử dụng điểm cho đơn hàng ${data.orderNumber}`,
            },
          });
        }

        if (data.loyaltyPointsUsed > 0) await evaluateTier(tx, data.customerId);
        if (data.cartId) {
          await tx.$queryRaw`SELECT id FROM cart_items WHERE cart_id=${data.cartId}::uuid ORDER BY id FOR UPDATE`;
          for (const item of data.items) {
            const removed = await tx.cartItem.deleteMany({
              where: {
                cartId: data.cartId,
                cart: { customerId: data.customerId },
                productVariantId: item.productVariantId,
                quantity: item.quantity,
                isSelected: true,
              },
            });
            if (removed.count !== 1)
              throw new ConflictException('CART_CHANGED');
          }
        }
        await notifyCustomer(
          tx,
          data.customerId,
          `ORDER:${order.id}:PENDING`,
          'Đã nhận đơn hàng',
          'ORDER',
          { orderId: order.id },
        );

        // 6. Create Payment record (Default COD PENDING)
        await tx.payment.create({
          data: {
            orderId: order.id,
            paymentMethod: data.paymentMethod,
            amount: data.totalAmount,
            status: 'PENDING',
          },
        });

        // 7. Order Status History
        await tx.orderStatusHistory.create({
          data: {
            orderId: order.id,
            status: 'PENDING',
            note: 'Đơn hàng được khởi tạo thành công',
          },
        });

        const fullOrder = await tx.order.findUnique({
          where: { id: order.id },
          include: { items: true, payments: true },
        });

        return this.mapToEntity(fullOrder!);
      },
      { timeout: 20000 },
    );
  }

  async findById(id: string): Promise<OrderEntity | null> {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { items: true, payments: true },
    });

    return order ? this.mapToEntity(order) : null;
  }

  async findByOrderNumber(orderNumber: string): Promise<OrderEntity | null> {
    const order = await this.prisma.order.findUnique({
      where: { orderNumber },
      include: { items: true, payments: true },
    });

    return order ? this.mapToEntity(order) : null;
  }

  async findCustomerOrders(
    customerId: string,
    options: { page: number; limit: number; status?: string },
  ): Promise<{ orders: OrderEntity[]; total: number }> {
    const { page, limit, status } = options;
    const skip = (page - 1) * limit;

    const where: any = { customerId };
    if (status) {
      where.status = status;
    }

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { items: true, payments: true },
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      orders: orders.map((o) => this.mapToEntity(o)),
      total,
    };
  }

  async cancelOrderWithTransaction(
    orderId: string,
    customerId?: string,
    reason?: string,
  ): Promise<OrderEntity> {
    return this.prisma.$transaction(async (tx) => {
      // Pessimistic Row Lock (SELECT ... FOR UPDATE) on the order row
      const orders = await tx.$queryRaw<
        Array<{
          id: string;
          status: string;
          store_id: string;
          customer_id: string | null;
          coupon_id: string | null;
          loyalty_points_used: number;
          order_number: string;
        }>
      >`
        SELECT id, status, store_id, customer_id, coupon_id, loyalty_points_used, order_number 
        FROM orders 
        WHERE id = ${orderId}::uuid 
        FOR UPDATE;
      `;

      if (!orders || orders.length === 0) {
        throw new BadRequestException('Đơn hàng không tồn tại');
      }

      const existingRow = orders[0];
      if (customerId && existingRow.customer_id !== customerId)
        throw new NotFoundException('ORDER_NOT_FOUND');
      await cancelReplacementCredit(tx, orderId);
      if (existingRow.customer_id)
        await tx.$queryRaw`SELECT id FROM customers WHERE id=${existingRow.customer_id}::uuid FOR UPDATE`;
      if (existingRow.coupon_id)
        await tx.$queryRaw`SELECT id FROM coupons WHERE id=${existingRow.coupon_id}::uuid FOR UPDATE`;

      // Single Source of Truth: OrderStateMachine validates transition
      const actor: OrderActor = customerId ? 'CUSTOMER' : 'SYSTEM';
      OrderStateMachine.assertValidTransition(
        existingRow.status as OrderStatus,
        OrderStatus.CANCELLED,
        actor,
      );

      const items = await tx.orderItem.findMany({
        where: { orderId: existingRow.id },
      });
      await transitionPromotionAllocations(tx, existingRow.id, 'CANCELLED');
      const ids = items.map((item) => item.productVariantId);
      await tx.$queryRaw`SELECT id FROM inventory WHERE store_id=${existingRow.store_id}::uuid
        AND product_variant_id=ANY(${ids}::uuid[]) ORDER BY id FOR UPDATE`;

      // 1. Release reserved stock
      for (const item of items) {
        await tx.inventory.updateMany({
          where: {
            storeId: existingRow.store_id,
            productVariantId: item.productVariantId,
          },
          data: {
            reservedQuantity: {
              decrement: item.quantity,
            },
          },
        });
      }

      // 2. Refund coupon if used
      if (existingRow.coupon_id) {
        await tx.couponUsage.deleteMany({
          where: { orderId: existingRow.id },
        });

        await tx.coupon.update({
          where: { id: existingRow.coupon_id },
          data: {
            usedCount: { decrement: 1 },
          },
        });
      }

      // 3. Refund loyalty points if used
      if (existingRow.loyalty_points_used > 0 && existingRow.customer_id) {
        await tx.customer.update({
          where: { id: existingRow.customer_id },
          data: {
            totalPoints: { increment: existingRow.loyalty_points_used },
          },
        });

        await tx.loyaltyPointsTransaction.create({
          data: {
            customerId: existingRow.customer_id,
            orderId: existingRow.id,
            points: existingRow.loyalty_points_used,
            type: 'REFUND',
            eventKey: `ORDER:${orderId}:CANCEL_POINTS`,
            description: `Hoàn điểm do hủy đơn hàng ${existingRow.order_number}`,
          },
        });
      }
      if (existingRow.customer_id)
        await evaluateTier(tx, existingRow.customer_id);

      // 4. Update Payment to CANCELLED
      const completedPayments = await tx.payment.findMany({
        where: { orderId, status: 'COMPLETED' },
      });
      for (const payment of completedPayments)
        await tx.refund.upsert({
          where: { eventKey: `CANCEL:${orderId}:${payment.id}` },
          update: {},
          create: {
            orderId,
            paymentId: payment.id,
            amount: payment.amount,
            reason: reason || 'Hủy đơn',
            status: 'PENDING',
            eventKey: `CANCEL:${orderId}:${payment.id}`,
          },
        });
      await tx.payment.updateMany({
        where: { orderId: existingRow.id, status: 'PENDING' },
        data: { status: 'CANCELLED' },
      });

      // 5. Add status history
      await tx.orderStatusHistory.create({
        data: {
          orderId: existingRow.id,
          status: OrderStatus.CANCELLED,
          note: reason || 'Khách hàng hủy đơn',
        },
      });

      // 6. Update order status to CANCELLED
      const updatedOrder = await tx.order.update({
        where: { id: existingRow.id },
        data: { status: OrderStatus.CANCELLED },
        include: { items: true, payments: true },
      });

      await notifyCustomer(
        tx,
        existingRow.customer_id,
        `ORDER:${orderId}:CANCELLED`,
        'Đơn hàng đã hủy',
        'ORDER',
        { orderId },
      );

      return this.mapToEntity(updatedOrder);
    });
  }

  async cancelExpiredPendingOrders(cutoffDate: Date): Promise<number> {
    const expiredOrders = await this.prisma.order.findMany({
      where: {
        status: 'PENDING',
        orderType: { in: ['ONLINE', 'STORE_PICKUP'] },
        createdAt: { lte: cutoffDate },
      },
      select: {
        id: true,
        customerId: true,
      },
    });

    let cancelledCount = 0;
    for (const order of expiredOrders) {
      try {
        await this.cancelOrderWithTransaction(
          order.id,
          order.customerId || undefined,
          'Hệ thống tự động hủy do quá hạn 30 phút chưa xác nhận',
        );
        cancelledCount++;
      } catch (err) {
        // Continue canceling other orders
      }
    }

    return cancelledCount;
  }

  async getNextOrderSequence(date: Date): Promise<number> {
    const [row] = await this.prisma.$queryRaw<
      { value: bigint }[]
    >`SELECT nextval('customer_order_seq') AS value`;
    return Number(row.value);
  }

  async getCustomerCouponUsageCount(
    customerId: string,
    couponId: string,
  ): Promise<number> {
    return this.prisma.couponUsage.count({
      where: {
        customerId,
        couponId,
      },
    });
  }

  async findCouponByCode(code: string): Promise<any | null> {
    const row = await this.prisma.coupon.findUnique({
      where: { code },
    });
    return row
      ? {
          ...row,
          discountType:
            row.discountType === 'FIXED' ? 'FIXED_AMOUNT' : row.discountType,
          discountValue: Number(row.discountValue),
          minOrderAmount: Number(row.minOrderAmount),
        }
      : null;
  }

  async getCustomerPoints(customerId: string): Promise<number> {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      select: { totalPoints: true },
    });

    return customer?.totalPoints ?? 0;
  }

  private mapToEntity(row: any): OrderEntity {
    return new OrderEntity({
      id: row.id,
      orderNumber: row.orderNumber,
      customerId: row.customerId,
      storeId: row.storeId,
      orderType: row.orderType,
      status: row.status,
      subtotal: Number(row.subtotal),
      discountAmount: Number(row.discountAmount),
      shippingFee: Number(row.shippingFee),
      taxAmount: Number(row.taxAmount),
      totalAmount: Number(row.totalAmount),
      shippingAddress: row.shippingAddress as ShippingAddressVo,
      billingAddress: row.billingAddress,
      note: row.note,
      couponId: row.couponId,
      loyaltyPointsUsed: row.loyaltyPointsUsed,
      salesStaffId: row.salesStaffId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      items: (row.items || []).map(
        (i: any) =>
          new OrderItemEntity({
            id: i.id,
            orderId: i.orderId,
            productVariantId: i.productVariantId,
            productName: i.productName,
            variantName: i.variantName,
            quantity: i.quantity,
            unitPrice: Number(i.unitPrice),
            discountAmount: Number(i.discountAmount),
            totalPrice: Number(i.totalPrice),
            createdAt: i.createdAt,
          }),
      ),
      payments: row.payments,
    });
  }
}
