import { BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaReturnAdminRepository } from '../prisma-return-admin.repository';

const future = new Date('2030-01-01');

function item(id: string, variant: string, qty: number, amount: number, batches: { id: string; q: number }[] = []) {
  return {
    id,
    productVariantId: variant,
    quantity: qty,
    refundAmount: amount,
    variant: { sku: `SKU-${variant}` },
    orderItem: {
      orderItemBatches: batches.map((b) => ({ quantity: b.q, batch: { id: b.id, expiryDate: future } })),
    },
  };
}

function setup(opts: { status?: string; returnType?: string; items: ReturnType<typeof item>[] }) {
  const tx = {
    $queryRaw: jest.fn().mockResolvedValue([
      { id: 'batch-1', store_id: 'store-1', product_variant_id: 'v1', expiry_date: future, is_active: true },
    ]),
    returnOrder: {
      findUniqueOrThrow: jest.fn().mockImplementation(({ select }) =>
        Promise.resolve(
          select?.orderId
            ? { orderId: 'order-1' }
            : {
                id: 'ret-1',
                status: opts.status ?? 'RECEIVED',
                storeId: 'store-1',
                returnType: opts.returnType ?? 'REFUND',
              },
        ),
      ),
      update: jest.fn(),
    },
    returnOrderItem: { findMany: jest.fn().mockResolvedValue(opts.items), update: jest.fn() },
    batch: { update: jest.fn() },
    inventory: { upsert: jest.fn() },
    inventoryTransaction: { create: jest.fn() },
  };
  const prisma = { $transaction: jest.fn((fn) => fn(tx)) };
  const integration = {
    returnStatusChanged: jest.fn(),
    reserveRefund: jest.fn(),
    completeReturn: jest.fn(),
  };
  const returns = { prepareExchangeQuote: jest.fn() };
  const repo = new PrismaReturnAdminRepository(prisma as never, integration as never, returns as never);
  return { repo, tx, integration, returns };
}

describe('PrismaReturnAdminRepository', () => {
  describe('inspect', () => {
    it('REFUND: nhập lại dòng bán lại được vào lô đã bán, dòng hỏng không nhập, rồi giữ tiền hoàn bằng tổng giá trị dòng', async () => {
      const { repo, tx, integration, returns } = setup({
        items: [item('i1', 'v1', 2, 300000, [{ id: 'batch-1', q: 2 }]), item('i2', 'v2', 1, 150000)],
      });

      const result = await repo.inspect({
        id: 'ret-1',
        actorId: 'u1',
        lines: [
          { returnOrderItemId: 'i1', condition: 'RESALEABLE' },
          { returnOrderItemId: 'i2', condition: 'DAMAGED', note: 'Đã khui nắp' },
        ],
      });

      expect(result).toEqual({
        restockedQuantity: 2,
        damagedQuantity: 1,
        refundsReserved: true,
        quotePrepared: false,
      });
      expect(tx.inventoryTransaction.create).toHaveBeenCalledTimes(1);
      expect(tx.inventoryTransaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ transactionType: 'RETURN', quantity: 2, batchId: 'batch-1', storeId: 'store-1' }),
      });
      expect(tx.returnOrderItem.update).toHaveBeenCalledWith({
        where: { id: 'i1' },
        data: expect.objectContaining({ condition: 'RESALEABLE', restockStoreId: 'store-1', restockBatchId: 'batch-1' }),
      });
      expect(tx.returnOrderItem.update).toHaveBeenCalledWith({
        where: { id: 'i2' },
        data: expect.objectContaining({ condition: 'DAMAGED', restockBatchId: null, note: 'Đã khui nắp' }),
      });
      expect(tx.returnOrder.update).toHaveBeenCalledWith({
        where: { id: 'ret-1' },
        data: { status: 'INSPECTED', handledBy: 'u1' },
      });
      expect(integration.returnStatusChanged).toHaveBeenCalledWith(tx, 'ret-1', 'u1', 'INSPECTED', undefined);
      expect(integration.reserveRefund).toHaveBeenCalledWith(tx, 'ret-1', 450000);
      expect(returns.prepareExchangeQuote).not.toHaveBeenCalled();
    });

    it('EXCHANGE: lập báo giá cho khách, không tự tạo phiếu hoàn tiền', async () => {
      const { repo, integration, returns } = setup({
        returnType: 'EXCHANGE',
        items: [item('i1', 'v1', 1, 100000, [{ id: 'batch-1', q: 1 }])],
      });
      const result = await repo.inspect({
        id: 'ret-1',
        actorId: 'u1',
        lines: [{ returnOrderItemId: 'i1', condition: 'RESALEABLE' }],
      });
      expect(result.quotePrepared).toBe(true);
      expect(returns.prepareExchangeQuote).toHaveBeenCalledWith(expect.anything(), 'ret-1');
      expect(integration.reserveRefund).not.toHaveBeenCalled();
    });

    it('thiếu một dòng hoặc trùng dòng -> 400, chưa nhập kho gì', async () => {
      const { repo, tx } = setup({ items: [item('i1', 'v1', 1, 1, []), item('i2', 'v2', 1, 1, [])] });
      await expect(
        repo.inspect({ id: 'ret-1', actorId: 'u1', lines: [{ returnOrderItemId: 'i1', condition: 'DAMAGED' }] }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        repo.inspect({
          id: 'ret-1',
          actorId: 'u1',
          lines: [
            { returnOrderItemId: 'i1', condition: 'DAMAGED' },
            { returnOrderItemId: 'i1', condition: 'DAMAGED' },
          ],
        }),
      ).rejects.toThrow(BadRequestException);
      expect(tx.inventoryTransaction.create).not.toHaveBeenCalled();
    });

    it('dòng bán lại được nhưng không xác định được lô -> 400 yêu cầu chọn lô hoặc ghi hàng hỏng', async () => {
      const { repo } = setup({ items: [item('i1', 'v1', 1, 1, [])] });
      await expect(
        repo.inspect({ id: 'ret-1', actorId: 'u1', lines: [{ returnOrderItemId: 'i1', condition: 'RESALEABLE' }] }),
      ).rejects.toThrow(/chọn lô/);
    });

    it('dùng lô admin chọn thay cho lô mặc định', async () => {
      const { repo, tx } = setup({ items: [item('i1', 'v1', 1, 1, [{ id: 'other', q: 9 }])] });
      await repo.inspect({
        id: 'ret-1',
        actorId: 'u1',
        lines: [{ returnOrderItemId: 'i1', condition: 'RESALEABLE', restockBatchId: 'batch-1' }],
      });
      expect(tx.batch.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'batch-1' } }));
    });

    it('sai trạng thái (chưa nhận hàng) -> 409, không đụng kho', async () => {
      const { repo, tx } = setup({ status: 'APPROVED', items: [item('i1', 'v1', 1, 1, [])] });
      await expect(
        repo.inspect({ id: 'ret-1', actorId: 'u1', lines: [{ returnOrderItemId: 'i1', condition: 'DAMAGED' }] }),
      ).rejects.toThrow(ConflictException);
      expect(tx.returnOrderItem.findMany).not.toHaveBeenCalled();
    });
  });

  describe('chuyển trạng thái', () => {
    it('approve: cập nhật trạng thái, người xử lý và gọi sự kiện của Trung với ghi chú công khai', async () => {
      const { repo, tx, integration } = setup({ status: 'REQUESTED', items: [] });
      await repo.approve({ id: 'ret-1', actorId: 'u1', note: 'OK' });
      expect(tx.returnOrder.update).toHaveBeenCalledWith({
        where: { id: 'ret-1' },
        data: { status: 'APPROVED', handledBy: 'u1' },
      });
      expect(integration.returnStatusChanged).toHaveBeenCalledWith(tx, 'ret-1', 'u1', 'APPROVED', 'OK');
    });

    it('reject: lưu lý do vào adminNote và ghi chú công khai', async () => {
      const { repo, tx, integration } = setup({ status: 'RECEIVED', items: [] });
      await repo.reject({ id: 'ret-1', actorId: 'u1', reason: 'Hết hạn đổi trả' });
      expect(tx.returnOrder.update).toHaveBeenCalledWith({
        where: { id: 'ret-1' },
        data: { status: 'REJECTED', handledBy: 'u1', adminNote: 'Hết hạn đổi trả' },
      });
      expect(integration.returnStatusChanged).toHaveBeenCalledWith(
        tx,
        'ret-1',
        'u1',
        'REJECTED',
        'Hết hạn đổi trả',
      );
    });

    it('không nhảy cóc: REQUESTED -> RECEIVED bị chặn, không cập nhật gì', async () => {
      const { repo, tx } = setup({ status: 'REQUESTED', items: [] });
      await expect(repo.markReceived({ id: 'ret-1', actorId: 'u1' })).rejects.toThrow(ConflictException);
      expect(tx.returnOrder.update).not.toHaveBeenCalled();
    });

    it('không từ chối được sau khi đã kiểm định', async () => {
      const { repo } = setup({ status: 'INSPECTED', items: [] });
      await expect(repo.reject({ id: 'ret-1', actorId: 'u1', reason: 'x' })).rejects.toThrow(ConflictException);
    });
  });

  describe('complete', () => {
    it('giao cho completeReturn của Trung khi đang INSPECTED', async () => {
      const { repo, integration, tx } = setup({ status: 'INSPECTED', items: [] });
      await repo.complete({ id: 'ret-1', actorId: 'u1' });
      expect(integration.completeReturn).toHaveBeenCalledWith(tx, 'ret-1', 'u1');
    });
    it('chưa kiểm định thì 409', async () => {
      const { repo, integration } = setup({ status: 'RECEIVED', items: [] });
      await expect(repo.complete({ id: 'ret-1', actorId: 'u1' })).rejects.toThrow(ConflictException);
      expect(integration.completeReturn).not.toHaveBeenCalled();
    });
  });
});
