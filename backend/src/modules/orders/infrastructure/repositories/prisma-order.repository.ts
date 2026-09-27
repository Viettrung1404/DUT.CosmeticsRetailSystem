import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import {
  IOrderRepository,
  CreateOrderTransactionInput,
} from '../../domain/repositories/order.repository.interface';
import { OrderEntity, ShippingAddressVo } from '../../domain/entities/order.entity';
import { OrderItemEntity } from '../../domain/entities/order-item.entity';

@Injectable()
export class PrismaOrderRepository implements IOrderRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createOrderWithTransaction(
    data: CreateOrderTransactionInput,
  ): Promise<OrderEntity> {
    return this.prisma.$transaction(async (tx) => {
      // 1. Reserve inventory for all items at designated store
      for (const item of data.items) {
        const inv = await tx.inventory.findFirst({
          where: {
            storeId: data.storeId,
            productVariantId: item.productVariantId,
          },
        });

        if (!inv) {
          throw new BadRequestException(
            `Sản phẩm ${item.productName} chưa được cấu hình tồn kho tại chi nhánh này`,
          );
        }

        const available = inv.quantity - inv.reservedQuantity;
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

      // 2. Create Order record
      const order = await tx.order.create({
        data: {
          orderNumber: data.orderNumber,
          customerId: data.customerId,
          storeId: data.storeId,
          orderType: data.orderType,
          status: 'PENDING',
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
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: true },
      });

      if (!existing) {
        throw new BadRequestException('Đơn hàng không tồn tại');
      }

      if (existing.status !== 'PENDING') {
        throw new BadRequestException(
          'Chỉ có thể hủy đơn hàng khi đơn đang ở trạng thái PENDING',
        );
      }

      // 1. Release reserved stock
      for (const item of existing.items) {
        await tx.inventory.updateMany({
          where: {
            storeId: existing.storeId,
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
      if (existing.couponId) {
        await tx.couponUsage.deleteMany({
          where: { orderId: existing.id },
        });

        await tx.coupon.update({
          where: { id: existing.couponId },
          data: {
            usedCount: { decrement: 1 },
          },
        });
      }

      // 3. Refund loyalty points if used
      if (existing.loyaltyPointsUsed > 0 && existing.customerId) {
        await tx.customer.update({
          where: { id: existing.customerId },
          data: {
            totalPoints: { increment: existing.loyaltyPointsUsed },
          },
        });

        await tx.loyaltyPointsTransaction.create({
          data: {
            customerId: existing.customerId,
            orderId: existing.id,
            points: existing.loyaltyPointsUsed,
            type: 'REFUND',
            description: `Hoàn điểm do hủy đơn hàng ${existing.orderNumber}`,
          },
        });
      }

      // 4. Update Payment to CANCELLED
      await tx.payment.updateMany({
        where: { orderId: existing.id },
        data: { status: 'CANCELLED' },
      });

      // 5. Add status history
      await tx.orderStatusHistory.create({
        data: {
          orderId: existing.id,
          status: 'CANCELLED',
          note: reason || 'Khách hàng hủy đơn',
        },
      });

      // 6. Update order status to CANCELLED
      const updatedOrder = await tx.order.update({
        where: { id: existing.id },
        data: { status: 'CANCELLED' },
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
      payments: row.payments,
    });
  }
}
