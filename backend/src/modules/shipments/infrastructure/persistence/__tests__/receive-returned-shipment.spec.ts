import { BadRequestException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaShipmentRepository } from '../prisma-shipment.repository';

const FUTURE = new Date('2030-01-01');
const PAST = new Date('2020-01-01');

function setup(
  opts: {
    status?: string;
    received?: number;
    outs?: { productVariantId: string; batchId: string | null; quantity: number }[];
    batches?: Record<string, { is_active: boolean; expiry_date: Date }>;
    payments?: { id: string; amount: Prisma.Decimal }[];
  } = {},
) {
  const batches = opts.batches ?? { b1: { is_active: true, expiry_date: FUTURE } };
  const tx = {
    shipment: {
      findUniqueOrThrow: jest
        .fn()
        .mockResolvedValueOnce({ orderId: 'o1' })
        .mockResolvedValue({
          id: 's1',
          shipmentCode: 'VD1',
          status: opts.status ?? 'RETURNED',
          order: { storeId: 'S1', orderNumber: 'ORD1', customerId: 'c1', couponId: 'cp1', loyaltyPointsUsed: 500 },
        }),
    },
    auditLog: { count: jest.fn().mockResolvedValue(opts.received ?? 0), create: jest.fn() },
    inventoryTransaction: {
      findMany: jest.fn().mockResolvedValue(
        opts.outs ?? [
          { productVariantId: 'v1', batchId: 'b1', quantity: -3 },
          { productVariantId: 'v2', batchId: null, quantity: -1 },
        ],
      ),
      create: jest.fn(),
    },
    batch: { update: jest.fn() },
    inventory: { upsert: jest.fn() },
    payment: { findMany: jest.fn().mockResolvedValue(opts.payments ?? []) },
    refund: { upsert: jest.fn() },
    $queryRaw: jest.fn((sql: TemplateStringsArray, ...values: unknown[]) => {
      const text = sql.join('');
      if (text.includes('FROM orders')) return Promise.resolve([{ id: 'o1', status: 'RETURNED' }]);
      if (text.includes('FROM batches')) return Promise.resolve(batches[values[0] as string] ? [batches[values[0] as string]] : []);
      return Promise.resolve([]);
    }),
  };
  const prisma = { transaction: jest.fn((fn: (t: unknown) => unknown) => fn(tx)) };
  const orders = { releaseBenefits: jest.fn().mockResolvedValue({ couponReleased: true, pointsRefunded: 500 }) };
  const repo = new PrismaShipmentRepository(prisma as never, {} as never, orders as never);
  return { tx, repo, orders };
}

const run = (s: ReturnType<typeof setup>, damaged: { productVariantId: string; quantity: number }[] = []) =>
  s.repo.receiveReturned({ shipmentId: 's1', actorId: 'u1', damaged });

describe('PrismaShipmentRepository.receiveReturned', () => {
  it('nhập lại đúng lô đã xuất, biến thể không lô thì chỉ cộng tồn tổng, ghi thẻ kho RETURN', async () => {
    const s = setup();
    const result = await run(s);
    expect(s.tx.batch.update).toHaveBeenCalledWith({ where: { id: 'b1' }, data: { quantity: { increment: 3 } } });
    expect(s.tx.batch.update).toHaveBeenCalledTimes(1);
    expect(s.tx.inventory.upsert).toHaveBeenCalledTimes(2);
    expect(s.tx.inventoryTransaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        transactionType: 'RETURN',
        quantity: 3,
        batchId: 'b1',
        referenceType: 'SHIPMENT',
        referenceId: 's1',
        storeId: 'S1',
      }),
    });
    expect(result.restocked).toEqual([
      { productVariantId: 'v1', batchId: 'b1', quantity: 3 },
      { productVariantId: 'v2', batchId: null, quantity: 1 },
    ]);
    expect(result.refundAmount).toBe(0);
    expect(s.tx.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: 'SHIPMENT_RETURN_RECEIVED', entityId: 's1' }),
    });
  });

  it('hàng hỏng bị trừ ra, không nhập lại', async () => {
    const s = setup();
    const result = await run(s, [{ productVariantId: 'v1', quantity: 1 }]);
    expect(s.tx.batch.update).toHaveBeenCalledWith({ where: { id: 'b1' }, data: { quantity: { increment: 2 } } });
    expect(result.notRestocked).toEqual([
      { productVariantId: 'v1', batchId: 'b1', quantity: 1, reason: 'Hỏng khi vận chuyển' },
    ]);
  });

  it('lô đã hết hạn: không nhập lại, báo lý do', async () => {
    const s = setup({ batches: { b1: { is_active: true, expiry_date: PAST } } });
    const result = await run(s);
    expect(s.tx.batch.update).not.toHaveBeenCalled();
    expect(result.notRestocked[0]).toEqual(expect.objectContaining({ batchId: 'b1', quantity: 3 }));
  });

  it('số hỏng vượt số đã xuất -> 400, không ghi gì', async () => {
    const s = setup();
    await expect(run(s, [{ productVariantId: 'v1', quantity: 4 }])).rejects.toThrow(BadRequestException);
    await expect(run(setup(), [{ productVariantId: 'khac', quantity: 1 }])).rejects.toThrow(BadRequestException);
    expect(s.tx.inventory.upsert).not.toHaveBeenCalled();
  });

  it('đơn đã trả trước (SePay): tạo phiếu hoàn PENDING chờ Kế toán, khóa chống trùng theo vận đơn', async () => {
    const s = setup({ payments: [{ id: 'p1', amount: new Prisma.Decimal(350000) }] });
    const result = await run(s);
    expect(s.tx.payment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { orderId: 'o1', status: 'COMPLETED', paymentMethod: { not: 'COD' } },
      }),
    );
    expect(s.tx.refund.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { compensationKey: 'SHIPMENT_RETURN:s1:p1' },
        create: expect.objectContaining({ orderId: 'o1', paymentId: 'p1', status: 'PENDING' }),
      }),
    );
    expect(result.refundAmount).toBe(350000);
  });

  it('trả lại voucher và điểm khách đã dùng, dùng chung logic hủy đơn', async () => {
    const s = setup();
    const result = await run(s);
    expect(s.orders.releaseBenefits).toHaveBeenCalledWith(s.tx, {
      orderId: 'o1',
      orderNumber: 'ORD1',
      customerId: 'c1',
      couponId: 'cp1',
      loyaltyPointsUsed: 500,
      reason: 'SHIPMENT_RETURN',
    });
    expect(result).toEqual(expect.objectContaining({ couponReleased: true, pointsRefunded: 500 }));
  });

  it('vận đơn chưa hoàn về -> 409', async () => {
    await expect(run(setup({ status: 'DELIVERING' }))).rejects.toThrow(ConflictException);
  });

  it('đã nhận hàng hoàn rồi -> 409, không nhập kho lần hai', async () => {
    const s = setup({ received: 1 });
    await expect(run(s)).rejects.toThrow('SHIPMENT_RETURN_ALREADY_RECEIVED');
    expect(s.tx.inventory.upsert).not.toHaveBeenCalled();
    expect(s.orders.releaseBenefits).not.toHaveBeenCalled();
  });
});
