import { Injectable, BadRequestException } from '@nestjs/common';
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
import { enqueueOrderEvent } from '@core/services/order-events';
import { validatePaymentAmount } from '@modules/payments/domain/payment-policy';
import { assertGatewayReady } from '@modules/payments/domain/gateway-readiness';
import { cancelReservedOrder } from '@core/services/cancel-reserved-order';

@Injectable()
export class PrismaOrderRepository implements IOrderRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createOrderWithTransaction(
    data: CreateOrderTransactionInput,
  ): Promise<OrderEntity> {
    validatePaymentAmount(data.paymentMethod, data.totalAmount);
    assertGatewayReady(data.paymentMethod);
    return this.prisma.transaction(async (tx) => {
      const locked = await tx.$queryRaw<
        Array<{
          id: string;
          product_variant_id: string;
          quantity: number;
          reserved_quantity: number;
        }>
      >`
        SELECT id, product_variant_id, quantity, reserved_quantity FROM inventory
        WHERE store_id=${data.storeId}::uuid AND product_variant_id = ANY(${data.items.map((i) => i.productVariantId)}::uuid[])
        ORDER BY id FOR UPDATE`;
      // Revalidate balances and usage while locked; pricing snapshots alone cannot prevent concurrent spending.
      if (data.couponId) {
        await tx.$queryRaw`SELECT id FROM coupons WHERE id=${data.couponId}::uuid FOR UPDATE`;
        const coupon = await tx.coupon.findUnique({
          where: { id: data.couponId },
        });
        const now = new Date();
        if (
          !coupon ||
          !coupon.isActive ||
          now < coupon.startDate ||
          now > coupon.endDate ||
          Number(coupon.minOrderAmount) > data.subtotal ||
          (coupon.customerId && coupon.customerId !== data.customerId) ||
          (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses)
        )
          throw new BadRequestException(
            'Mã giảm giá không còn đủ điều kiện sử dụng',
          );
        const used = await tx.couponUsage.count({
          where: { couponId: data.couponId, customerId: data.customerId },
        });
        if (used >= coupon.maxUsesPerCustomer)
          throw new BadRequestException(
            'Bạn đã sử dụng hết lượt cho mã giảm giá này',
          );
      }
      if (data.loyaltyPointsUsed > 0) {
        await tx.$queryRaw`SELECT id FROM customers WHERE id=${data.customerId}::uuid FOR UPDATE`;
        const customer = await tx.customer.findUniqueOrThrow({
          where: { id: data.customerId },
          select: { totalPoints: true },
        });
        if (
          !Number.isSafeInteger(data.loyaltyPointsUsed) ||
          customer.totalPoints < data.loyaltyPointsUsed
        )
          throw new BadRequestException(
            'Số điểm thưởng không còn đủ để thanh toán',
          );
      }
      // 1. Pessimistic Row Lock (SELECT ... FOR UPDATE) on inventory rows to prevent race condition
      for (const item of data.items) {
        const inventories = locked.filter(
          (i) => i.product_variant_id === item.productVariantId,
        );

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
        inv.reserved_quantity += item.quantity;
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
          unitCost: item.unitCost,
          discountAmount: item.discountAmount,
          totalPrice: item.totalPrice,
        })),
      });

      // 4. Handle Coupon Usage
      if (data.couponId) {
        await tx.couponUsage.create({
          data: {
            couponId: data.couponId,
            customerId: data.customerId,
            orderId: order.id,
            discountAmount: data.discountAmount,
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
            description: `Sử dụng điểm cho đơn hàng ${data.orderNumber}`,
          },
        });
      }

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

      await enqueueOrderEvent(tx, order.id, 'PENDING');
      if (data.cartId)
        await tx.cartItem.deleteMany({
          where: { cartId: data.cartId, cart: { customerId: data.customerId } },
        });
      const fullOrder = await tx.order.findUnique({
        where: { id: order.id },
        include: { items: true, payments: true },
      });

      return this.mapToEntity(fullOrder!);
    });
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
    return this.prisma.transaction(async (tx) => {
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
      if (customerId && customerId !== existingRow.customer_id)
        throw new BadRequestException('Đơn hàng không thuộc khách hàng');

      // Single Source of Truth: OrderStateMachine validates transition
      const actor: OrderActor = customerId ? 'CUSTOMER' : 'SYSTEM';
      OrderStateMachine.assertValidTransition(
        existingRow.status as OrderStatus,
        OrderStatus.CANCELLED,
        actor,
      );

      // One batch releases every reservation, coupon and point exactly once.
      await cancelReservedOrder(
        tx,
        existingRow.id,
        reason || 'Khách hàng hủy đơn',
      );
      await tx.$executeRaw`INSERT INTO refunds
        (id,order_id,payment_id,amount,reason,status,compensation_key,updated_at)
        SELECT gen_random_uuid(),p.order_id,p.id,p.amount,${reason || 'Đơn hàng đã hủy'},'PENDING',
          COALESCE('ONLINE_UNFULFILLED:'||p.payment_method||':'||NULLIF(p.transaction_id,''),
            'CANCEL:'||p.order_id||':'||p.id),clock_timestamp()
        FROM payments p WHERE p.order_id=${existingRow.id}::uuid AND p.status='COMPLETED'
        ON CONFLICT(compensation_key) DO NOTHING`;
      const updatedOrder = await tx.order.findUniqueOrThrow({
        where: { id: existingRow.id },
        include: { items: true, payments: true },
      });

      return this.mapToEntity(updatedOrder);
    });
  }

  async cancelExpiredPendingOrders(cutoffDate: Date): Promise<number> {
    const expiredOrders = await this.prisma.order.findMany({
      where: {
        status: 'PENDING',
        createdAt: { lte: cutoffDate },
        payments: { some: { paymentMethod: 'COD' } },
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
          undefined,
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
    const startOfDay = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      0,
      0,
      0,
    );
    const endOfDay = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      23,
      59,
      59,
      999,
    );

    const count = await this.prisma.order.count({
      where: {
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    return count + 1;
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
    return this.prisma.coupon.findUnique({
      where: { code },
    });
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
            unitCost: Number(i.unitCost),
            discountAmount: Number(i.discountAmount),
            totalPrice: Number(i.totalPrice),
            createdAt: i.createdAt,
          }),
      ),
      payments: (row.payments || []).map((p: any) => ({
        id: p.id,
        paymentMethod: p.paymentMethod,
        amount: Number(p.amount),
        status: p.status,
        paidAt: p.paidAt,
        createdAt: p.createdAt,
      })),
    });
  }
}
