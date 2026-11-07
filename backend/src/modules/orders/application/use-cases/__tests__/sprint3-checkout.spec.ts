import { CreateOrderUseCase } from '../create-order.use-case';
describe('Online checkout amount before side effects', () => {
  it('rejects discounted amount below gateway minimum before sequence/reservation/cart writes', async () => {
    const repo = {
      getCustomerPoints: async () => 100,
      getNextOrderSequence: jest.fn(),
      createOrderWithTransaction: jest.fn(),
    };
    const cart = { clearCart: jest.fn() };
    const useCase = new CreateOrderUseCase(
      repo as any,
      {
        calculatePricing: () => ({
          subtotal: 1000,
          totalAmount: 999,
          discountAmount: 1,
          pointsDiscount: 0,
          shippingFee: 0,
        }),
      } as any,
      { resolveStoreForOrder: async () => 'store' } as any,
      {
        getVariantsDetails: async () => [
          {
            id: 'variant',
            unitPrice: 1000,
            unitCost: 500,
            productName: 'Test',
            sku: 'Test',
          },
        ],
      } as any,
      cart as any,
    );
    await expect(
      useCase.execute({
        customerId: 'customer',
        shippingAddress: {
          recipientName: 'Test',
          phone: '0901234567',
          addressLine: 'Test',
          city: 'Test',
        },
        paymentMethod: 'MOMO',
        items: [{ variantId: 'variant', quantity: 1 }],
      }),
    ).rejects.toThrow('1.000');
    expect(repo.getNextOrderSequence).not.toHaveBeenCalled();
    expect(repo.createOrderWithTransaction).not.toHaveBeenCalled();
    expect(cart.clearCart).not.toHaveBeenCalled();
  });
});
