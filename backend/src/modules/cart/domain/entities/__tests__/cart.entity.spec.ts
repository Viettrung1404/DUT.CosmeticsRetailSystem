import { CartEntity } from '../cart.entity';
import { CartItemEntity } from '../cart-item.entity';

describe('CartEntity & CartItemEntity (Domain TDD & DDD)', () => {
  it('should create a CartItemEntity and calculate total price', () => {
    const item = new CartItemEntity({
      id: 'item-1',
      cartId: 'cart-1',
      productVariantId: 'var-1',
      quantity: 2,
      unitPrice: 250000,
      currentPrice: 250000,
      productName: 'Kem Dưỡng Ẩm GlowUp 50ml',
      variantName: '50ml',
      sku: 'GLOW-CREAM-50',
      thumbnailUrl: 'https://example.com/img.jpg',
      availableStock: 10,
    });

    expect(item.id).toBe('item-1');
    expect(item.quantity).toBe(2);
    expect(item.unitPrice).toBe(250000);
    expect(item.currentPrice).toBe(250000);
    expect(item.getTotalPrice()).toBe(500000);
    expect(item.priceChanged).toBe(false);
    expect(item.isSelected).toBe(true);
    expect(item.isQuantityExceeded).toBe(false);
  });

  it('should detect price changes via priceChanged getter', () => {
    const item = new CartItemEntity({
      id: 'item-1',
      cartId: 'cart-1',
      productVariantId: 'var-1',
      quantity: 1,
      unitPrice: 200000,
      currentPrice: 250000,
    });

    expect(item.priceChanged).toBe(true);
    expect(item.getTotalPrice()).toBe(250000);
  });

  it('should detect stock depletion via isQuantityExceeded', () => {
    const item = new CartItemEntity({
      id: 'item-1',
      cartId: 'cart-1',
      productVariantId: 'var-1',
      quantity: 5,
      unitPrice: 100000,
      availableStock: 2, // depleted!
    });

    expect(item.isQuantityExceeded).toBe(true);
  });

  it('should toggle selection for partial checkout', () => {
    const item = new CartItemEntity({
      id: 'item-1',
      cartId: 'cart-1',
      productVariantId: 'var-1',
      quantity: 1,
      unitPrice: 100000,
    });

    expect(item.isSelected).toBe(true);
    item.toggleSelected(false);
    expect(item.isSelected).toBe(false);
    item.toggleSelected(true);
    expect(item.isSelected).toBe(true);
    item.toggleSelected(); // default toggles
    expect(item.isSelected).toBe(false);
  });

  it('should default currentPrice to unitPrice when not provided', () => {
    const item = new CartItemEntity({
      id: 'item-1',
      cartId: 'cart-1',
      productVariantId: 'var-1',
      quantity: 1,
      unitPrice: 150000,
    });

    expect(item.currentPrice).toBe(150000);
    expect(item.priceChanged).toBe(false);
  });

  it('should default isVariantActive to true when not provided', () => {
    const item = new CartItemEntity({
      id: 'item-1',
      cartId: 'cart-1',
      productVariantId: 'var-1',
      quantity: 1,
      unitPrice: 100000,
    });

    expect(item.isVariantActive).toBe(true);
  });

  it('should respect isVariantActive = false when explicitly set', () => {
    const item = new CartItemEntity({
      id: 'item-1',
      cartId: 'cart-1',
      productVariantId: 'var-1',
      quantity: 1,
      unitPrice: 100000,
      isVariantActive: false,
    });

    expect(item.isVariantActive).toBe(false);
  });

  it('should throw error when updating item quantity exceeding available stock, > 99, or <= 0', () => {
    const item = new CartItemEntity({
      id: 'item-1',
      cartId: 'cart-1',
      productVariantId: 'var-1',
      quantity: 2,
      unitPrice: 250000,
      availableStock: 5,
    });

    expect(() => item.updateQuantity(0, 5)).toThrow('Số lượng phải lớn hơn 0');
    expect(() => item.updateQuantity(-1, 5)).toThrow('Số lượng phải lớn hơn 0');
    expect(() => item.updateQuantity(100, 200)).toThrow('Số lượng cho mỗi sản phẩm tối đa là 99');
    expect(() => item.updateQuantity(6, 5)).toThrow('vượt quá tồn kho khả dụng');

    item.updateQuantity(4, 5);
    expect(item.quantity).toBe(4);
    expect(item.getTotalPrice()).toBe(1000000);
  });

  it('should calculate cart subtotal and selected subtotal correctly (Partial Checkout)', () => {
    const item1 = new CartItemEntity({
      id: 'item-1',
      cartId: 'cart-1',
      productVariantId: 'var-1',
      quantity: 2,
      unitPrice: 200000,
      currentPrice: 200000,
      isSelected: true,
      availableStock: 10,
    });

    const item2 = new CartItemEntity({
      id: 'item-2',
      cartId: 'cart-1',
      productVariantId: 'var-2',
      quantity: 1,
      unitPrice: 350000,
      currentPrice: 350000,
      isSelected: false, // Not selected for checkout!
      availableStock: 5,
    });

    const cart = new CartEntity({
      id: 'cart-1',
      customerId: 'cust-1',
      items: [item1, item2],
    });

    expect(cart.getTotalQuantity()).toBe(3);
    expect(cart.getSubtotal()).toBe(750000);

    // Partial Checkout getters
    expect(cart.getSelectedQuantity()).toBe(2);
    expect(cart.getSelectedSubtotal()).toBe(400000); // 2 * 200k only!
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

  it('should throw when adding item that exceeds maxStock or > 99', () => {
    const cart = new CartEntity({
      id: 'cart-1',
      customerId: 'cust-1',
      items: [],
    });

    const itemExceedStock = new CartItemEntity({
      id: 'item-1',
      cartId: 'cart-1',
      productVariantId: 'var-1',
      quantity: 10,
      unitPrice: 100000,
    });

    expect(() => cart.addItem(itemExceedStock, 5)).toThrow('vượt quá tồn kho khả dụng');

    const itemExceed99 = new CartItemEntity({
      id: 'item-2',
      cartId: 'cart-1',
      productVariantId: 'var-2',
      quantity: 100,
      unitPrice: 100000,
    });

    expect(() => cart.addItem(itemExceed99, 200)).toThrow('Số lượng cho mỗi sản phẩm tối đa là 99');
  });

  it('should toggle item selection within cart', () => {
    const item = new CartItemEntity({
      id: 'item-1',
      cartId: 'cart-1',
      productVariantId: 'var-1',
      quantity: 2,
      unitPrice: 100000,
      isSelected: true,
    });

    const cart = new CartEntity({
      id: 'cart-1',
      customerId: 'cust-1',
      items: [item],
    });

    cart.toggleItemSelection('item-1', false);
    expect(cart.items[0].isSelected).toBe(false);
    expect(cart.getSelectedSubtotal()).toBe(0);

    expect(() => cart.toggleItemSelection('non-existent')).toThrow('không tồn tại');
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

  it('should not throw when removing non-existent item', () => {
    const cart = new CartEntity({
      id: 'cart-1',
      customerId: 'cust-1',
      items: [],
    });

    cart.removeItem('non-existent');
    expect(cart.items.length).toBe(0);
  });

  it('should handle empty cart subtotal and quantity', () => {
    const cart = new CartEntity({
      id: 'cart-1',
      customerId: 'cust-1',
      items: [],
    });

    expect(cart.getSubtotal()).toBe(0);
    expect(cart.getTotalQuantity()).toBe(0);
    expect(cart.getSelectedSubtotal()).toBe(0);
    expect(cart.getSelectedQuantity()).toBe(0);
  });
});
