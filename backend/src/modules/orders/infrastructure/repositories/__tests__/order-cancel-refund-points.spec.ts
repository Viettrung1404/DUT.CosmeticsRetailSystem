import { Prisma } from '@prisma/client';
import { PrismaOrderRepository } from '../prisma-order.repository';
import { OrderStatus } from '@core/domain/orders/order-status.enum';

jest.mock('@core/services/customer-events', () => ({
  notifyCustomer: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@core/services/promotion-lifecycle', () => ({
  transitionPromotionAllocations: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@modules/customer-commerce/application/loyalty.service', () => ({
  evaluateTier: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@modules/returns/application/services/exchange-settlement.service', () => ({
  cancelReplacementCredit: jest.fn().mockResolvedValue(undefined),
}));

describe('Order cancellation with payment refund to points', () => {
  it('refunds both loyalty_points_used and completed payment amount into customer totalPoints', async () => {
    const tx = {
      $queryRaw: jest.fn().mockImplementation(async (query: any) => {
        const text =
          query?.sql ||
          query?.text ||
          (query?.strings ? query.strings.join(' ') : '') ||
          (Array.isArray(query) ? query.join(' ') : '') ||
          String(query);
        if (text.includes('orders') || text.includes('loyalty_points_used')) {
          return [
            {
              id: 'ord-123',
              status: OrderStatus.PENDING,
              store_id: 'store-1',
              customer_id: 'cust-456',
              coupon_id: null,
              loyalty_points_used: 20000,
              order_number: 'ORD-GLOW-123',
            },
          ];
        }
        return [];
      }),
      orderItem: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      exchangeSettlement: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
      inventory: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      customer: {
        update: jest.fn().mockResolvedValue({}),
      },
      loyaltyPointsTransaction: {
        create: jest.fn().mockResolvedValue({}),
      },
      payment: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'pay-789',
            amount: new Prisma.Decimal(150000),
            status: 'COMPLETED',
          },
        ]),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      refund: {
        upsert: jest.fn().mockResolvedValue({}),
      },
      orderStatusHistory: {
        create: jest.fn().mockResolvedValue({}),
      },
      order: {
        update: jest.fn().mockResolvedValue({
          id: 'ord-123',
          orderNumber: 'ORD-GLOW-123',
          customerId: 'cust-456',
          storeId: 'store-1',
          status: OrderStatus.CANCELLED,
          subtotal: new Prisma.Decimal(170000),
          discountAmount: new Prisma.Decimal(20000),
          shippingFee: new Prisma.Decimal(0),
          totalAmount: new Prisma.Decimal(150000),
          loyaltyPointsUsed: 20000,
          createdAt: new Date(),
          items: [],
          payments: [],
          shipments: [],
        }),
      },
    };

    const db = {
      $transaction: jest.fn(async (callback: any) => callback(tx)),
    };

    const repository = new PrismaOrderRepository(db as any);
    const result = await repository.cancelOrderWithTransaction('ord-123', 'cust-456', 'Khách đổi ý');

    expect(result.status).toBe(OrderStatus.CANCELLED);

    // 1. Phải hoàn 20.000 điểm đã dùng
    expect(tx.customer.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'cust-456' },
        data: { totalPoints: { increment: 20000 } },
      }),
    );

    // 2. Phải hoàn 150.000đ tiền thanh toán thành 150.000 xu vào ví
    expect(tx.customer.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'cust-456' },
        data: { totalPoints: { increment: 150000 } },
      }),
    );

    // 3. Phải tạo transaction REFUND cho cả điểm dùng và thanh toán
    expect(tx.loyaltyPointsTransaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        customerId: 'cust-456',
        orderId: 'ord-123',
        points: 20000,
        type: 'REFUND',
      }),
    });

    expect(tx.loyaltyPointsTransaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        customerId: 'cust-456',
        orderId: 'ord-123',
        points: 150000,
        type: 'REFUND',
        description: expect.stringContaining('Hoàn tiền thanh toán đơn ORD-GLOW-123 vào xu'),
      }),
    });

    // 4. Lệnh hoàn tiền Refund được đánh dấu COMPLETED vì đã hoàn vào xu
    expect(tx.refund.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          orderId: 'ord-123',
          paymentId: 'pay-789',
          amount: new Prisma.Decimal(150000),
          status: 'COMPLETED',
        }),
      }),
    );
  });
});
