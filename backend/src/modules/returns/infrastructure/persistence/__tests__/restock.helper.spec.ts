import { BadRequestException, ConflictException } from '@nestjs/common';
import { restockReturnedItem } from '../restock.helper';

const NOW = new Date('2026-11-09T03:00:00Z');
const params = {
  returnId: 'ret-1',
  storeId: 'store-1',
  variantId: 'var-1',
  quantity: 3,
  batchId: 'batch-1',
  actorId: 'user-1',
  now: NOW,
};

function makeTx(batchRow: Record<string, unknown> | undefined) {
  return {
    $queryRaw: jest.fn().mockResolvedValue(batchRow ? [batchRow] : []),
    batch: { update: jest.fn() },
    inventory: { upsert: jest.fn() },
    inventoryTransaction: { create: jest.fn() },
  };
}
const goodBatch = {
  id: 'batch-1',
  store_id: 'store-1',
  product_variant_id: 'var-1',
  expiry_date: new Date('2027-06-01'),
  is_active: true,
};

describe('restockReturnedItem', () => {
  it('cộng lô, cộng tồn tổng và ghi inventory_transactions RETURN dương', async () => {
    const tx = makeTx(goodBatch);
    await restockReturnedItem(tx as never, params);

    expect(tx.batch.update).toHaveBeenCalledWith({
      where: { id: 'batch-1' },
      data: { quantity: { increment: 3 } },
    });
    expect(tx.inventory.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { storeId_productVariantId: { storeId: 'store-1', productVariantId: 'var-1' } },
        update: { quantity: { increment: 3 }, lastRestockAt: NOW },
        create: expect.objectContaining({ storeId: 'store-1', productVariantId: 'var-1', quantity: 3 }),
      }),
    );
    expect(tx.inventoryTransaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        storeId: 'store-1',
        productVariantId: 'var-1',
        batchId: 'batch-1',
        transactionType: 'RETURN',
        quantity: 3,
        referenceType: 'RETURN_ORDER',
        referenceId: 'ret-1',
        createdBy: 'user-1',
      }),
    });
  });

  it('lô không tồn tại hoặc thuộc cửa hàng/sản phẩm khác -> 400, không ghi gì', async () => {
    for (const row of [undefined, { ...goodBatch, store_id: 'other' }, { ...goodBatch, product_variant_id: 'other' }]) {
      const tx = makeTx(row);
      await expect(restockReturnedItem(tx as never, params)).rejects.toThrow(BadRequestException);
      expect(tx.batch.update).not.toHaveBeenCalled();
      expect(tx.inventoryTransaction.create).not.toHaveBeenCalled();
    }
  });

  it('lô hết hạn hoặc ngừng dùng -> 409, không nhập kho', async () => {
    for (const row of [
      { ...goodBatch, expiry_date: new Date('2026-10-01') },
      { ...goodBatch, is_active: false },
    ]) {
      const tx = makeTx(row);
      await expect(restockReturnedItem(tx as never, params)).rejects.toThrow(ConflictException);
      expect(tx.inventory.upsert).not.toHaveBeenCalled();
    }
  });
});
