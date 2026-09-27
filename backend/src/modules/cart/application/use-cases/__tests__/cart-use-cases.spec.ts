import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ICartRepository } from '../../../domain/repositories/cart.repository.interface';
import { CartEntity } from '../../../domain/entities/cart.entity';
import { CartItemEntity } from '../../../domain/entities/cart-item.entity';
import { AddToCartUseCase } from '../add-to-cart.use-case';
import { GetCartUseCase } from '../get-cart.use-case';
import { UpdateCartItemUseCase } from '../update-cart-item.use-case';
import { RemoveCartItemUseCase } from '../remove-cart-item.use-case';
import { MergeCartUseCase } from '../merge-cart.use-case';

describe('Cart Use Cases (Application TDD)', () => {
  let mockRepo: jest.Mocked<ICartRepository>;
  let addToCartUseCase: AddToCartUseCase;
  let getCartUseCase: GetCartUseCase;
  let updateCartItemUseCase: UpdateCartItemUseCase;
  let removeCartItemUseCase: RemoveCartItemUseCase;
  let mergeCartUseCase: MergeCartUseCase;

  beforeEach(() => {
    mockRepo = {
      findCart: jest.fn(),
      findCartById: jest.fn(),
      createCart: jest.fn(),
      findCartItem: jest.fn(),
      findCartItemById: jest.fn(),
      addItem: jest.fn(),
      updateItemQuantity: jest.fn(),
      removeItem: jest.fn(),
      clearCart: jest.fn(),
      mergeCarts: jest.fn(),
      getVariantStockAndPrice: jest.fn(),
    };

    addToCartUseCase = new AddToCartUseCase(mockRepo);
    getCartUseCase = new GetCartUseCase(mockRepo);
    updateCartItemUseCase = new UpdateCartItemUseCase(mockRepo);
    removeCartItemUseCase = new RemoveCartItemUseCase(mockRepo);
    mergeCartUseCase = new MergeCartUseCase(mockRepo);
  });

  describe('AddToCartUseCase', () => {
    it('should throw BadRequestException if variant not found or inactive', async () => {
      mockRepo.getVariantStockAndPrice.mockResolvedValue(null);

      await expect(
        addToCartUseCase.execute({
          customerId: 'cust-1',
          productVariantId: 'var-999',
          quantity: 1,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if requested quantity exceeds available stock', async () => {
      mockRepo.getVariantStockAndPrice.mockResolvedValue({
        availableStock: 2,
        price: 200000,
        productName: 'Son Thỏi Lì',
        variantName: 'Đỏ Ruby',
        sku: 'SON-RUBY',
        isActive: true,
      });

      await expect(
        addToCartUseCase.execute({
          customerId: 'cust-1',
          productVariantId: 'var-1',
          quantity: 3,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create cart if none exists and add new item', async () => {
      mockRepo.getVariantStockAndPrice.mockResolvedValue({
        availableStock: 10,
        price: 200000,
        productName: 'Son Thỏi Lì',
        variantName: 'Đỏ Ruby',
        sku: 'SON-RUBY',
        isActive: true,
      });
      mockRepo.findCart.mockResolvedValue(null);
      const newCart = new CartEntity({ id: 'cart-new', customerId: 'cust-1', items: [] });
      mockRepo.createCart.mockResolvedValue(newCart);
      mockRepo.findCartItem.mockResolvedValue(null);
      mockRepo.addItem.mockResolvedValue(
        new CartItemEntity({
          id: 'item-1',
          cartId: 'cart-new',
          productVariantId: 'var-1',
          quantity: 2,
          unitPrice: 200000,
        }),
      );

      const updatedCart = new CartEntity({
        id: 'cart-new',
        customerId: 'cust-1',
        items: [
          new CartItemEntity({
            id: 'item-1',
            cartId: 'cart-new',
            productVariantId: 'var-1',
            quantity: 2,
            unitPrice: 200000,
          }),
        ],
      });
      mockRepo.findCartById.mockResolvedValue(updatedCart);

      const result = await addToCartUseCase.execute({
        customerId: 'cust-1',
        productVariantId: 'var-1',
        quantity: 2,
      });

      expect(mockRepo.createCart).toHaveBeenCalledWith({ customerId: 'cust-1', sessionId: undefined, storeId: undefined });
      expect(mockRepo.addItem).toHaveBeenCalled();
      expect(result.items.length).toBe(1);
    });

    it('should increment existing item quantity up to available stock', async () => {
      mockRepo.getVariantStockAndPrice.mockResolvedValue({
        availableStock: 5,
        price: 200000,
        productName: 'Son Thỏi Lì',
        variantName: 'Đỏ Ruby',
        sku: 'SON-RUBY',
        isActive: true,
      });
      const existingCart = new CartEntity({ id: 'cart-1', customerId: 'cust-1' });
      mockRepo.findCart.mockResolvedValue(existingCart);
      const existingItem = new CartItemEntity({
        id: 'item-1',
        cartId: 'cart-1',
        productVariantId: 'var-1',
        quantity: 2,
        unitPrice: 200000,
      });
      mockRepo.findCartItem.mockResolvedValue(existingItem);
      mockRepo.updateItemQuantity.mockResolvedValue(
        new CartItemEntity({
          id: 'item-1',
          cartId: 'cart-1',
          productVariantId: 'var-1',
          quantity: 4,
          unitPrice: 200000,
        }),
      );
      mockRepo.findCartById.mockResolvedValue(existingCart);

      await addToCartUseCase.execute({
        customerId: 'cust-1',
        productVariantId: 'var-1',
        quantity: 2,
      });

      expect(mockRepo.updateItemQuantity).toHaveBeenCalledWith('item-1', 4);
    });
  });

  describe('GetCartUseCase', () => {
    it('should return empty cart if no cart exists in DB', async () => {
      mockRepo.findCart.mockResolvedValue(null);

      const cart = await getCartUseCase.execute({ customerId: 'cust-1' });
      expect(cart.items).toEqual([]);
      expect(cart.subtotal).toBe(0);
    });

    it('should return populated cart with subtotal and item details', async () => {
      const existingCart = new CartEntity({
        id: 'cart-1',
        customerId: 'cust-1',
        items: [
          new CartItemEntity({
            id: 'item-1',
            cartId: 'cart-1',
            productVariantId: 'var-1',
            quantity: 2,
            unitPrice: 150000,
            productName: 'Tẩy Trang',
            variantName: '200ml',
            availableStock: 10,
          }),
        ],
      });
      mockRepo.findCart.mockResolvedValue(existingCart);

      const res = await getCartUseCase.execute({ customerId: 'cust-1' });
      expect(res.id).toBe('cart-1');
      expect(res.items.length).toBe(1);
      expect(res.subtotal).toBe(300000);
      expect(res.totalQuantity).toBe(2);
    });
  });

  describe('UpdateCartItemUseCase', () => {
    it('should throw NotFoundException if item does not exist', async () => {
      mockRepo.findCartItemById.mockResolvedValue(null);

      await expect(
        updateCartItemUseCase.execute({
          cartItemId: 'item-999',
          quantity: 3,
          customerId: 'cust-1',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update quantity and return updated cart', async () => {
      const item = new CartItemEntity({
        id: 'item-1',
        cartId: 'cart-1',
        productVariantId: 'var-1',
        quantity: 1,
        unitPrice: 100000,
      });
      mockRepo.findCartItemById.mockResolvedValue(item);
      mockRepo.findCartById.mockResolvedValue(
        new CartEntity({ id: 'cart-1', customerId: 'cust-1', items: [item] }),
      );
      mockRepo.getVariantStockAndPrice.mockResolvedValue({
        availableStock: 10,
        price: 100000,
        productName: 'Sữa Rửa Mặt',
        variantName: '150ml',
        sku: 'SRM-150',
        isActive: true,
      });

      await updateCartItemUseCase.execute({
        cartItemId: 'item-1',
        quantity: 4,
        customerId: 'cust-1',
      });

      expect(mockRepo.updateItemQuantity).toHaveBeenCalledWith('item-1', 4);
    });
  });

  describe('RemoveCartItemUseCase', () => {
    it('should remove item when authorized', async () => {
      const item = new CartItemEntity({
        id: 'item-1',
        cartId: 'cart-1',
        productVariantId: 'var-1',
        quantity: 1,
        unitPrice: 100000,
      });
      mockRepo.findCartItemById.mockResolvedValue(item);
      mockRepo.findCartById.mockResolvedValue(
        new CartEntity({ id: 'cart-1', customerId: 'cust-1', items: [item] }),
      );

      await removeCartItemUseCase.execute({
        cartItemId: 'item-1',
        customerId: 'cust-1',
      });

      expect(mockRepo.removeItem).toHaveBeenCalledWith('item-1');
    });
  });

  describe('MergeCartUseCase', () => {
    it('should merge guest cart into customer cart', async () => {
      const guestItem = new CartItemEntity({
        id: 'guest-item-1',
        cartId: 'cart-guest',
        productVariantId: 'var-1',
        quantity: 1,
        unitPrice: 100000,
      });
      const guestCart = new CartEntity({ id: 'cart-guest', sessionId: 'sess-1', items: [guestItem] });
      const customerCart = new CartEntity({ id: 'cart-customer', customerId: 'cust-1' });

      mockRepo.findCart
        .mockResolvedValueOnce(guestCart)
        .mockResolvedValueOnce(customerCart);

      mockRepo.mergeCarts.mockResolvedValue(
        new CartEntity({ id: 'cart-customer', customerId: 'cust-1' }),
      );

      await mergeCartUseCase.execute({
        sessionId: 'sess-1',
        customerId: 'cust-1',
      });

      expect(mockRepo.mergeCarts).toHaveBeenCalledWith('cart-guest', 'cart-customer');
    });
  });
});
