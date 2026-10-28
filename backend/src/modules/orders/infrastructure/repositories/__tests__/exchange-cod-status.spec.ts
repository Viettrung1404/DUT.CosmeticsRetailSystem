import { Prisma } from '@prisma/client';
import { OrderStatus } from '@core/domain/orders/order-status.enum';
import { PrismaAdminOrderRepository } from '../prisma-admin-order.repository';

describe('Exchange replacement COD funding', () => {
  let repo: PrismaAdminOrderRepository;
  let tx: any;
  let order: any;

  beforeEach(() => {
    order = { id: 'replacement', status: OrderStatus.CONFIRMED, total_amount: new Prisma.Decimal(1000) };
    tx = {
      exchangeSettlement: { findUnique: jest.fn().mockResolvedValue({ status: 'ACTIVE', creditApplied: new Prisma.Decimal(200) }) },
      payment: {
        aggregate: jest.fn().mockImplementation(({ where }) => Promise.resolve({ _sum: { amount: where.status === 'PENDING' ? 800 : 0 } })),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    repo = new PrismaAdminOrderRepository({ transaction: (work: any) => work(tx) } as any);
    jest.spyOn(repo as any, 'lockOrder').mockImplementation(async () => order);
    jest.spyOn(repo as any, 'changeStatus').mockResolvedValue(undefined);
    jest.spyOn(repo as any, 'deductStockForShipping').mockResolvedValue(undefined);
    jest.spyOn(repo as any, 'rewardCustomer').mockResolvedValue(null);
    jest.spyOn(repo as any, 'createCommission').mockResolvedValue(null);
  });

  it.each([
    [OrderStatus.CONFIRMED, OrderStatus.PROCESSING],
    [OrderStatus.PROCESSING, OrderStatus.SHIPPING],
    [OrderStatus.SHIPPING, OrderStatus.DELIVERED],
  ])('allows pending COD coverage from %s to %s', async (from, target) => {
    order.status = from;
    const result = await repo.updateStatus({ orderId: order.id, target, changedBy: 'staff' });
    expect(result.codPaymentsCompleted).toBe(target === OrderStatus.DELIVERED ? 1 : 0);
    expect(tx.payment.updateMany).toHaveBeenCalledTimes(target === OrderStatus.DELIVERED ? 1 : 0);
    if (target === OrderStatus.DELIVERED) {
      expect(tx.payment.updateMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { orderId: order.id, paymentMethod: 'COD', status: 'PENDING' },
        data: { status: 'COMPLETED', paidAt: expect.any(Date) },
      }));
    }
  });

  it('requires collected funds before completion', async () => {
    order.status = OrderStatus.DELIVERED;
    await expect(repo.updateStatus({ orderId: order.id, target: OrderStatus.COMPLETED, changedBy: 'staff' })).rejects.toThrow('EXCHANGE_SETTLEMENT_UNPAID');
  });

  it('completes after COD is collected', async () => {
    order.status = OrderStatus.DELIVERED;
    tx.payment.aggregate.mockImplementation(({ where }: any) => Promise.resolve({ _sum: { amount: where.status === 'COMPLETED' ? 800 : 0 } }));
    await expect(repo.updateStatus({ orderId: order.id, target: OrderStatus.COMPLETED, changedBy: 'staff' })).resolves.toBeDefined();
  });

  it.each(['inactive', 'underfunded'])('rejects %s settlement before processing', async (kind) => {
    if (kind === 'inactive') tx.exchangeSettlement.findUnique.mockResolvedValue({ status: 'CANCELLED', creditApplied: new Prisma.Decimal(200) });
    else tx.payment.aggregate.mockResolvedValue({ _sum: { amount: 0 } });
    await expect(repo.updateStatus({ orderId: order.id, target: OrderStatus.PROCESSING, changedBy: 'staff' })).rejects.toThrow('EXCHANGE_SETTLEMENT_UNPAID');
  });
});
