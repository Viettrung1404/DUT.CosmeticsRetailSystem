import { ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaRefundAdminRepository } from '../prisma-refund-admin.repository';

const D = (n: number) => new Prisma.Decimal(n);

function setup(opts: {
  refund?: Partial<{ status: string; amount: Prisma.Decimal; paymentId: string | null; returnOrderId: string | null }>;
  paymentAmount?: number;
  paymentStatus?: string;
  otherOnPayment?: number;
  returnType?: string;
  itemsCredit?: number;
  otherOnReturn?: number;
}) {
  const refund = {
    id: 'rf-1',
    orderId: 'order-1',
    status: 'PENDING',
    amount: D(450000),
    paymentId: 'pay-1',
    returnOrderId: 'ret-1',
    ...opts.refund,
  };
  const tx = {
    $queryRaw: jest.fn(),
    refund: {
      findUniqueOrThrow: jest.fn().mockResolvedValue(refund),
      update: jest.fn(),
      aggregate: jest
        .fn()
        .mockImplementation(({ where }) =>
          Promise.resolve({
            _sum: { amount: D(where.paymentId ? (opts.otherOnPayment ?? 0) : (opts.otherOnReturn ?? 0)) },
          }),
        ),
    },
    payment: {
      findUniqueOrThrow: jest.fn().mockResolvedValue({
        id: 'pay-1',
        amount: D(opts.paymentAmount ?? 500000),
        status: opts.paymentStatus ?? 'COMPLETED',
      }),
    },
    returnOrder: {
      findUniqueOrThrow: jest.fn().mockResolvedValue({
        id: 'ret-1',
        returnType: opts.returnType ?? 'REFUND',
        items: [{ refundAmount: D(opts.itemsCredit ?? 450000) }],
        settlement: null,
      }),
    },
    auditLog: { create: jest.fn() },
  };
  const prisma = { $transaction: jest.fn((fn) => fn(tx)) };
  const integration = { refundCompleted: jest.fn() };
  return { repo: new PrismaRefundAdminRepository(prisma as never, integration as never), tx, integration };
}

describe('PrismaRefundAdminRepository.process', () => {
  it('hoàn xong: COMPLETED + mã tham chiếu + nhật ký + báo khách qua integration của Trung', async () => {
    const { repo, tx, integration } = setup({});
    await repo.process({ id: 'rf-1', actorId: 'u1', method: 'BANK_TRANSFER', reference: ' FT123 ', note: 'ok' });

    expect(tx.refund.update).toHaveBeenCalledWith({
      where: { id: 'rf-1' },
      data: { status: 'COMPLETED', processedAt: expect.any(Date), refundTransactionId: 'FT123' },
    });
    expect(tx.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'u1',
        action: 'REFUND_PROCESS',
        entityType: 'refunds',
        entityId: 'rf-1',
        newData: { status: 'COMPLETED', method: 'BANK_TRANSFER', reference: 'FT123', note: 'ok' },
      }),
    });
    expect(integration.refundCompleted).toHaveBeenCalledWith(tx, 'rf-1');
  });

  it('phiếu đã COMPLETED -> 409, không ghi gì', async () => {
    const { repo, tx } = setup({ refund: { status: 'COMPLETED' } });
    await expect(repo.process({ id: 'rf-1', actorId: 'u1', method: 'CASH' })).rejects.toThrow(/đã được hoàn/);
    expect(tx.refund.update).not.toHaveBeenCalled();
  });

  it('thử lại phiếu FAILED được, nhưng phải qua kiểm hạn mức', async () => {
    const { repo, tx } = setup({ refund: { status: 'FAILED' } });
    await repo.process({ id: 'rf-1', actorId: 'u1', method: 'CASH' });
    expect(tx.refund.update).toHaveBeenCalled();
  });

  it('tổng hoàn vượt số tiền khách đã thanh toán -> 409', async () => {
    const { repo, tx } = setup({ paymentAmount: 500000, otherOnPayment: 100000 });
    await expect(repo.process({ id: 'rf-1', actorId: 'u1', method: 'CASH' })).rejects.toThrow(
      /vượt quá số tiền khách đã thanh toán/,
    );
    expect(tx.refund.update).not.toHaveBeenCalled();
  });

  it('tổng hoàn vượt giá trị hàng trả trong đơn gốc -> 409', async () => {
    const { repo, tx } = setup({ itemsCredit: 400000 });
    await expect(repo.process({ id: 'rf-1', actorId: 'u1', method: 'CASH' })).rejects.toThrow(
      /vượt quá giá trị hàng đổi trả/,
    );
    expect(tx.refund.update).not.toHaveBeenCalled();
  });

  it('đổi hàng chưa chấp nhận báo giá: hạn mức 0 nên không hoàn được', async () => {
    const { repo } = setup({ returnType: 'EXCHANGE' });
    await expect(repo.process({ id: 'rf-1', actorId: 'u1', method: 'CASH' })).rejects.toThrow(ConflictException);
  });

  it('khoản thanh toán gốc chưa hoàn tất -> 409', async () => {
    const { repo } = setup({ paymentStatus: 'PENDING' });
    await expect(repo.process({ id: 'rf-1', actorId: 'u1', method: 'CASH' })).rejects.toThrow(/chưa hoàn tất/);
  });

  it('phiếu hoàn của đơn bị hủy (không có yêu cầu trả) chỉ bị chặn bởi khoản thanh toán', async () => {
    const { repo, tx } = setup({ refund: { returnOrderId: null } });
    await repo.process({ id: 'rf-1', actorId: 'u1', method: 'CASH' });
    expect(tx.returnOrder.findUniqueOrThrow).not.toHaveBeenCalled();
    expect(tx.refund.update).toHaveBeenCalled();
  });
});

describe('PrismaRefundAdminRepository.reject', () => {
  it('PENDING -> FAILED kèm nhật ký lý do', async () => {
    const { repo, tx } = setup({});
    await repo.reject({ id: 'rf-1', actorId: 'u1', reason: 'Chưa có tài khoản nhận' });
    expect(tx.refund.update).toHaveBeenCalledWith({ where: { id: 'rf-1' }, data: { status: 'FAILED' } });
    expect(tx.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'REFUND_REJECT',
        newData: { status: 'FAILED', note: 'Chưa có tài khoản nhận' },
      }),
    });
  });
  it('phiếu đã hoàn không từ chối được', async () => {
    const { repo, tx } = setup({ refund: { status: 'COMPLETED' } });
    await expect(repo.reject({ id: 'rf-1', actorId: 'u1', reason: 'x' })).rejects.toThrow(ConflictException);
    expect(tx.refund.update).not.toHaveBeenCalled();
  });
});
