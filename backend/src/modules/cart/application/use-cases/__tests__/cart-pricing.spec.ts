import { GetCartUseCase } from '../get-cart.use-case';
import { CartEntity } from '../../../domain/entities/cart.entity';
import { CartItemEntity } from '../../../domain/entities/cart-item.entity';

describe('Cart uses quantity-aware checkout pricing', () => {
  it('keeps exact line totals and excludes unselected items from cart conditions', async () => {
    const items = [true, true, false].map((isSelected, i) => new CartItemEntity({
      id: String(i), cartId: 'cart', productVariantId: `variant-${i}`, quantity: 3,
      unitPrice: 100000, isSelected, isVariantActive: true, availableStock: 20,
    }));
    const repository = { findCart: jest.fn().mockResolvedValue(new CartEntity({ id: 'cart', items })) };
    const pricing = { quote: jest.fn(async ({ items }) => ({ items: items.map(item => ({
      variantId: item.variantId, effectivePrice: 83333.33, afterLineDiscount: 250000,
    })) })) };
    const result = await new GetCartUseCase(repository as never, pricing as never)
      .execute({ customerId: 'customer' });
    expect(pricing.quote.mock.calls.map(call => call[0].items.length)).toEqual([2, 1]);
    expect(result.selectedSubtotal).toBe(500000);
    expect(result.subtotal).toBe(750000);
    expect(result.items[0].totalPrice).toBe(250000);
  });
});
