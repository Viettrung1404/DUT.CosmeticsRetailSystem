import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ICartRepository } from '../../../domain/repositories/cart.repository.interface';
import { CartEntity } from '../../../domain/entities/cart.entity';
import { CartItemEntity } from '../../../domain/entities/cart-item.entity';
import { AddToCartUseCase } from '../add-to-cart.use-case';
import { GetCartUseCase } from '../get-cart.use-case';
import { UpdateCartItemUseCase } from '../update-cart-item.use-case';
import { RemoveCartItemUseCase } from '../remove-cart-item.use-case';
import { MergeCartUseCase } from '../merge-cart.use-case';

describe('Cart Use Cases (Application TDD & DDD)', () => {
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
      updateItemSelection: jest.fn(),
      updateItem: jest.fn(),
      updateItemPrice: jest.fn(),
      removeItem: jest.fn(),
      clearCart: jest.fn(),
      mergeCarts: jest.fn(),
      getVariantStockAndPrice: jest.fn(),
      getVariantsStockAndPrice: jest.fn(),
      deleteExpiredGuestCarts: jest.fn(),
    };

    addToCartUseCase = new AddToCartUseCase(mockRepo);
    getCartUseCase = new GetCartUseCase(mockRepo);
    updateCartItemUseCase = new UpdateCartItemUseCase(mockRepo);
    removeCartItemUseCase = new RemoveCartItemUseCase(mockRepo);
    mergeCartUseCase = new MergeCartUseCase(mockRepo);
  });

  // ─── AddToCartUseCase ─────────────────────────────────

  describe('AddToCartUseCase', () => {
    it('should throw BadRequestException if no customerId and no sessionId', async () => {
      await expect(
        addToCartUseCase.execute({
          productVariantId: 'var-1',
          quantity: 1,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if quantity is 0 or negative', async () => {
      await expect(
        addToCartUseCase.execute({
          customerId: 'cust-1',
          productVariantId: 'var-1',
          quantity: 0,
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        addToCartUseCase.execute({
          customerId: 'cust-1',
          productVariantId: 'var-1',
          quantity: -1,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if variant not found', async () => {
      mockRepo.getVariantStockAndPrice.mockResolvedValue(null);

      await expect(
        addToCartUseCase.execute({
          customerId: 'cust-1',
          productVariantId: 'var-999',
          quantity: 1,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if variant is inactive', async () => {
      mockRepo.getVariantStockAndPrice.mockResolvedValue({
        availableStock: 10,
        price: 200000,
        productName: 'Son',
        variantName: 'Đỏ',
        sku: 'SON-1',
        isActive: false,
      });

      await expect(
        addToCartUseCase.execute({
          customerId: 'cust-1',
          productVariantId: 'var-1',
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

    it('should create cart if none exists and add item via atomic upsert', async () => {
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
      mockRepo.addItem.mockResolvedValue(
        new CartItemEntity({
          id: 'item-1',
          cartId: 'cart-new',
          productVariantId: 'var-1',
          quantity: 2,
          unitPrice: 200000,
        }),
      );

      await addToCartUseCase.execute({
        customerId: 'cust-1',
        productVariantId: 'var-1',
        quantity: 2,
      });

      expect(mockRepo.createCart).toHaveBeenCalledWith({ customerId: 'cust-1', sessionId: undefined, storeId: undefined });
      expect(mockRepo.addItem).toHaveBeenCalledWith('cart-new', {
        productVariantId: 'var-1',
        quantity: 2,
        unitPrice: 200000,
        isSelected: true,
      });
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
      const existingItem = new CartItemEntity({
        id: 'item-1',
        cartId: 'cart-1',
        productVariantId: 'var-1',
        quantity: 2,
        unitPrice: 200000,
      });
      const existingCart = new CartEntity({ id: 'cart-1', customerId: 'cust-1', items: [existingItem] });
      mockRepo.findCart.mockResolvedValue(existingCart);

      await addToCartUseCase.execute({
        customerId: 'cust-1',
        productVariantId: 'var-1',
        quantity: 2,
      });

      expect(mockRepo.addItem).toHaveBeenCalledWith('cart-1', {
        productVariantId: 'var-1',
        quantity: 2,
        unitPrice: 200000,
        isSelected: true,
      });
    });

    it('should throw when existing + new quantity > 99', async () => {
      mockRepo.getVariantStockAndPrice.mockResolvedValue({
        availableStock: 200,
        price: 10000,
        productName: 'Test',
        variantName: 'Default',
        sku: 'TEST',
        isActive: true,
      });
      const existingItem = new CartItemEntity({
        id: 'item-1',
        cartId: 'cart-1',
        productVariantId: 'var-1',
        quantity: 95,
        unitPrice: 10000,
      });
      const existingCart = new CartEntity({ id: 'cart-1', customerId: 'cust-1', items: [existingItem] });
      mockRepo.findCart.mockResolvedValue(existingCart);

      await expect(
        addToCartUseCase.execute({
          customerId: 'cust-1',
          productVariantId: 'var-1',
          quantity: 10,
        }),
      ).rejects.toThrow('tối đa là 99');
    });

    it('should throw when existing + new quantity > available stock', async () => {
      mockRepo.getVariantStockAndPrice.mockResolvedValue({
        availableStock: 5,
        price: 200000,
        productName: 'Son',
        variantName: 'Đỏ',
        sku: 'SON-DO',
        isActive: true,
      });
      const existingItem = new CartItemEntity({
        id: 'item-1',
        cartId: 'cart-1',
        productVariantId: 'var-1',
        quantity: 4,
        unitPrice: 200000,
      });
      const existingCart = new CartEntity({ id: 'cart-1', customerId: 'cust-1', items: [existingItem] });
      mockRepo.findCart.mockResolvedValue(existingCart);

      await expect(
        addToCartUseCase.execute({
          customerId: 'cust-1',
          productVariantId: 'var-1',
          quantity: 2,
        }),
      ).rejects.toThrow('vượt quá tồn kho');
    });
  });

  // ─── GetCartUseCase ───────────────────────────────────

  describe('GetCartUseCase', () => {
    it('should return empty cart if no customerId and no sessionId', async () => {
      const cart = await getCartUseCase.execute({});
      expect(cart.items).toEqual([]);
      expect(cart.subtotal).toBe(0);
      expect(cart.selectedSubtotal).toBe(0);
    });

    it('should return empty cart if no cart exists in DB', async () => {
      mockRepo.findCart.mockResolvedValue(null);

      const cart = await getCartUseCase.execute({ customerId: 'cust-1' });
      expect(cart.items).toEqual([]);
      expect(cart.subtotal).toBe(0);
    });

    it('should return populated cart with single fetch, realtime prices and detect changes without DB writes', async () => {
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
            currentPrice: 180000, // Price changed in DB
            productName: 'Tẩy Trang',
            variantName: '200ml',
            availableStock: 10,
            isVariantActive: true,
            isSelected: true,
          }),
        ],
      });
      mockRepo.findCart.mockResolvedValue(existingCart);

      const res = await getCartUseCase.execute({ customerId: 'cust-1' });
      expect(res.id).toBe('cart-1');
      expect(res.items.length).toBe(1);
      expect(res.items[0].currentPrice).toBe(180000);
      expect(res.items[0].priceChanged).toBe(true);
      expect(res.items[0].isSelected).toBe(true);
      expect(res.items[0].isQuantityExceeded).toBe(false);
      expect(res.subtotal).toBe(360000);
      expect(res.selectedSubtotal).toBe(360000);
      expect(res.hasPriceChanges).toBe(true);

      // Verify P2: No writes during GET
      expect(mockRepo.updateItemPrice).not.toHaveBeenCalled();
    });

    it('should calculate partial checkout selectedSubtotal and selectedQuantity correctly', async () => {
      const existingCart = new CartEntity({
        id: 'cart-1',
        customerId: 'cust-1',
        items: [
          new CartItemEntity({
            id: 'item-1',
            cartId: 'cart-1',
            productVariantId: 'var-1',
            quantity: 2,
            unitPrice: 200000,
            currentPrice: 200000,
            isSelected: true,
            isVariantActive: true,
          }),
          new CartItemEntity({
            id: 'item-2',
            cartId: 'cart-1',
            productVariantId: 'var-2',
            quantity: 1,
            unitPrice: 300000,
            currentPrice: 300000,
            isSelected: false, // unselected
            isVariantActive: true,
          }),
        ],
      });
      mockRepo.findCart.mockResolvedValue(existingCart);

      const res = await getCartUseCase.execute({ customerId: 'cust-1' });
      expect(res.totalQuantity).toBe(3);
      expect(res.subtotal).toBe(700000); // 400k + 300k
      expect(res.selectedQuantity).toBe(2);
      expect(res.selectedSubtotal).toBe(400000); // 2 * 200k only!
    });

    it('should flag stock depletion via isQuantityExceeded', async () => {
      const existingCart = new CartEntity({
        id: 'cart-1',
        customerId: 'cust-1',
        items: [
          new CartItemEntity({
            id: 'item-1',
            cartId: 'cart-1',
            productVariantId: 'var-1',
            quantity: 5,
            unitPrice: 100000,
            currentPrice: 100000,
            availableStock: 2, // Stock fell to 2!
            isVariantActive: true,
          }),
        ],
      });
      mockRepo.findCart.mockResolvedValue(existingCart);

      const res = await getCartUseCase.execute({ customerId: 'cust-1' });
      expect(res.items[0].isQuantityExceeded).toBe(true);
      expect(res.items[0].availableStock).toBe(2);
    });

    it('should separate inactive items into unavailableItems', async () => {
      const existingCart = new CartEntity({
        id: 'cart-1',
        customerId: 'cust-1',
        items: [
          new CartItemEntity({
            id: 'item-1',
            cartId: 'cart-1',
            productVariantId: 'var-active',
            quantity: 1,
            unitPrice: 100000,
            currentPrice: 100000,
            isVariantActive: true,
          }),
          new CartItemEntity({
            id: 'item-2',
            cartId: 'cart-1',
            productVariantId: 'var-inactive',
            quantity: 1,
            unitPrice: 200000,
            currentPrice: 200000,
            isVariantActive: false,
          }),
        ],
      });
      mockRepo.findCart.mockResolvedValue(existingCart);

      const res = await getCartUseCase.execute({ customerId: 'cust-1' });
      expect(res.items.length).toBe(1);
      expect(res.unavailableItems.length).toBe(1);
      expect(res.unavailableItems[0].productVariantId).toBe('var-inactive');
      expect(res.subtotal).toBe(100000);
    });
  });

  // ─── UpdateCartItemUseCase ────────────────────────────

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

    it('should throw BadRequestException if both quantity and isSelected are missing', async () => {
      await expect(
        updateCartItemUseCase.execute({
          cartItemId: 'item-1',
          customerId: 'cust-1',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if quantity <= 0', async () => {
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
        productName: 'P',
        variantName: 'V',
        sku: 'S',
        isActive: true,
      });

      await expect(
        updateCartItemUseCase.execute({
          cartItemId: 'item-1',
          quantity: 0,
          customerId: 'cust-1',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if quantity > 99', async () => {
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
        availableStock: 200,
        price: 100000,
        productName: 'P',
        variantName: 'V',
        sku: 'S',
        isActive: true,
      });

      await expect(
        updateCartItemUseCase.execute({
          cartItemId: 'item-1',
          quantity: 100,
          customerId: 'cust-1',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException if customerId does not match', async () => {
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

      await expect(
        updateCartItemUseCase.execute({
          cartItemId: 'item-1',
          quantity: 2,
          customerId: 'cust-OTHER',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if guest sessionId does not match', async () => {
      const item = new CartItemEntity({
        id: 'item-1',
        cartId: 'cart-1',
        productVariantId: 'var-1',
        quantity: 1,
        unitPrice: 100000,
      });
      mockRepo.findCartItemById.mockResolvedValue(item);
      mockRepo.findCartById.mockResolvedValue(
        new CartEntity({ id: 'cart-1', sessionId: 'sess-1', items: [item] }),
      );

      await expect(
        updateCartItemUseCase.execute({
          cartItemId: 'item-1',
          quantity: 2,
          sessionId: 'sess-OTHER',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should update quantity and synchronize price', async () => {
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
        price: 120000, // Price updated
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

      expect(mockRepo.updateItem).toHaveBeenCalledWith('item-1', {
        quantity: 4,
        isSelected: undefined,
      });
      expect(mockRepo.updateItemPrice).toHaveBeenCalledWith('item-1', 120000);
    });

    it('should toggle isSelected for partial checkout', async () => {
      const item = new CartItemEntity({
        id: 'item-1',
        cartId: 'cart-1',
        productVariantId: 'var-1',
        quantity: 1,
        unitPrice: 100000,
        isSelected: true,
      });
      mockRepo.findCartItemById.mockResolvedValue(item);
      mockRepo.findCartById.mockResolvedValue(
        new CartEntity({ id: 'cart-1', customerId: 'cust-1', items: [item] }),
      );

      await updateCartItemUseCase.execute({
        cartItemId: 'item-1',
        isSelected: false,
        customerId: 'cust-1',
      });

      expect(mockRepo.updateItemSelection).toHaveBeenCalledWith('item-1', false);
    });
  });

  // ─── RemoveCartItemUseCase ────────────────────────────

  describe('RemoveCartItemUseCase', () => {
    it('should throw NotFoundException if item does not exist', async () => {
      mockRepo.findCartItemById.mockResolvedValue(null);

      await expect(
        removeCartItemUseCase.execute({
          cartItemId: 'item-999',
          customerId: 'cust-1',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if customerId does not match', async () => {
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

      await expect(
        removeCartItemUseCase.execute({
          cartItemId: 'item-1',
          customerId: 'cust-OTHER',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

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

  // ─── MergeCartUseCase ─────────────────────────────────

  describe('MergeCartUseCase', () => {
    it('should throw BadRequestException if missing sessionId or customerId', async () => {
      await expect(
        mergeCartUseCase.execute({ sessionId: '', customerId: 'cust-1' }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        mergeCartUseCase.execute({ sessionId: 'sess-1', customerId: '' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should do nothing if guest cart is empty', async () => {
      mockRepo.findCart.mockResolvedValue(
        new CartEntity({ id: 'cart-guest', sessionId: 'sess-1', items: [] }),
      );

      await mergeCartUseCase.execute({
        sessionId: 'sess-1',
        customerId: 'cust-1',
      });

      expect(mockRepo.mergeCarts).not.toHaveBeenCalled();
    });

    it('should do nothing if guest cart does not exist', async () => {
      mockRepo.findCart.mockResolvedValue(null);

      await mergeCartUseCase.execute({
        sessionId: 'sess-1',
        customerId: 'cust-1',
      });

      expect(mockRepo.mergeCarts).not.toHaveBeenCalled();
    });

    it('should create customer cart if not exists and merge', async () => {
      const guestItem = new CartItemEntity({
        id: 'guest-item-1',
        cartId: 'cart-guest',
        productVariantId: 'var-1',
        quantity: 1,
        unitPrice: 100000,
      });
      const guestCart = new CartEntity({ id: 'cart-guest', sessionId: 'sess-1', items: [guestItem] });

      mockRepo.findCart
        .mockResolvedValueOnce(guestCart)
        .mockResolvedValueOnce(null);

      const newCustomerCart = new CartEntity({ id: 'cart-customer', customerId: 'cust-1' });
      mockRepo.createCart.mockResolvedValue(newCustomerCart);
      mockRepo.mergeCarts.mockResolvedValue(newCustomerCart);

      await mergeCartUseCase.execute({
        sessionId: 'sess-1',
        customerId: 'cust-1',
      });

      expect(mockRepo.createCart).toHaveBeenCalledWith({ customerId: 'cust-1' });
      expect(mockRepo.mergeCarts).toHaveBeenCalledWith('cart-guest', 'cart-customer');
    });

    it('should merge guest cart into existing customer cart', async () => {
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

      mockRepo.mergeCarts.mockResolvedValue(customerCart);

      await mergeCartUseCase.execute({
        sessionId: 'sess-1',
        customerId: 'cust-1',
      });

      expect(mockRepo.mergeCarts).toHaveBeenCalledWith('cart-guest', 'cart-customer');
    });
  });
});
