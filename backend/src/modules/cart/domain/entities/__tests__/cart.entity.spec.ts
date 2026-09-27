import { CartEntity } from '../cart.entity';
import { CartItemEntity } from '../cart-item.entity';

describe('CartEntity & CartItemEntity (Domain TDD)', () => {
  it('should create a CartItemEntity and calculate total price', () => {
    const item = new CartItemEntity({
      id: 'item-1',
      cartId: 'cart-1',
      productVariantId: 'var-1',
      quantity: 2,
      unitPrice: 250000,
      productName: 'Kem Dưỡng Ẩm GlowUp 50ml',
      variantName: '50ml',
      sku: 'GLOW-CREAM-50',
      thumbnailUrl: 'https://example.com/img.jpg',
      availableStock: 10,
    });

    expect(item.id).toBe('item-1');
    expect(item.quantity).toBe(2);
    expect(item.unitPrice).toBe(250000);
    expect(item.getTotalPrice()).toBe(500000);
  });

  it('should throw error when updating item quantity exceeding available stock or <= 0', () => {
    const item = new CartItemEntity({
      id: 'item-1',
      cartId: 'cart-1',
      productVariantId: 'var-1',
      quantity: 2,
      unitPrice: 250000,
      availableStock: 5,
    });

    expect(() => item.updateQuantity(0, 5)).toThrow('Số lượng phải lớn hơn 0');
    expect(() => item.updateQuantity(6, 5)).toThrow('Số lượng vượt quá tồn kho khả dụng');

    item.updateQuantity(4, 5);
    expect(item.quantity).toBe(4);
    expect(item.getTotalPrice()).toBe(1000000);
  });

  it('should calculate cart subtotal and total quantity correctly', () => {
    const item1 = new CartItemEntity({
      id: 'item-1',
      cartId: 'cart-1',
      productVariantId: 'var-1',
      quantity: 2,
      unitPrice: 200000,
      availableStock: 10,
    });

    const item2 = new CartItemEntity({
      id: 'item-2',
      cartId: 'cart-1',
      productVariantId: 'var-2',
      quantity: 1,
      unitPrice: 350000,
      availableStock: 5,
    });

    const cart = new CartEntity({
      id: 'cart-1',
      customerId: 'cust-1',
      items: [item1, item2],
    });

    expect(cart.getTotalQuantity()).toBe(3);
    expect(cart.getSubtotal()).toBe(750000); // 2 * 200k + 1 * 350k = 750k
  });

  it('should add item or increment quantity if already exists in cart', () => {
    const cart = new CartEntity({
      id: 'cart-1',
      customerId: 'cust-1',
      items: [],
    });

    const item1 = new CartItemEntity({
      id: 'item-1',
      cartId: 'cart-1',
      productVariantId: 'var-1',
      quantity: 2,
      unitPrice: 150000,
      availableStock: 10,
    });

    cart.addItem(item1, 10);
    expect(cart.items.length).toBe(1);
    expect(cart.getTotalQuantity()).toBe(2);

    // Add again with quantity 3
    const item1Duplicate = new CartItemEntity({
      id: 'item-1-dup',
      cartId: 'cart-1',
      productVariantId: 'var-1',
      quantity: 3,
      unitPrice: 150000,
      availableStock: 10,
    });

    cart.addItem(item1Duplicate, 10);
    expect(cart.items.length).toBe(1);
    expect(cart.items[0].quantity).toBe(5);
    expect(cart.getSubtotal()).toBe(750000);
  });

  it('should remove item from cart', () => {
    const item1 = new CartItemEntity({
      id: 'item-1',
      cartId: 'cart-1',
      productVariantId: 'var-1',
      quantity: 2,
      unitPrice: 150000,
      availableStock: 10,
    });

    const cart = new CartEntity({
      id: 'cart-1',
      customerId: 'cust-1',
      items: [item1],
    });

    expect(cart.items.length).toBe(1);
    cart.removeItem('item-1');
    expect(cart.items.length).toBe(0);
    expect(cart.getSubtotal()).toBe(0);
  });
});
