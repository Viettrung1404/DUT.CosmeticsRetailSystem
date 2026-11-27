import { reservePromotionBenefits } from './promotion-lifecycle';

describe('Partial flash-sale quota reservation', () => {
  it('reserves only discounted units, leaving other units at regular price', async () => {
    const tx = {
      orderItem: { findMany: jest.fn().mockResolvedValue([{ id: 'item', productVariantId: 'variant' }]) },
      $executeRaw: jest.fn().mockResolvedValue(1),
      promotionAllocation: { create: jest.fn() },
      promotionOrderUsage: { create: jest.fn() },
    };
    await reservePromotionBenefits(tx as never, 'order', [{
      variantId: 'variant', quantity: 3, quotaQuantity: 1, promotionId: 'promo', quotaId: 'quota',
    }]);
    expect(tx.$executeRaw.mock.calls[0].slice(1)).toEqual([1, 'quota', 1]);
    expect(tx.promotionAllocation.create).toHaveBeenCalledWith({ data: {
      promotionId: 'promo', quotaId: 'quota', orderId: 'order', orderItemId: 'item', quantity: 1,
    } });
  });
});
