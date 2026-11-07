import { CartController } from '../cart.controller';
import { AddToCartUseCase } from '../../../application/use-cases/add-to-cart.use-case';
import { GetCartUseCase } from '../../../application/use-cases/get-cart.use-case';
import { UpdateCartItemUseCase } from '../../../application/use-cases/update-cart-item.use-case';
import { RemoveCartItemUseCase } from '../../../application/use-cases/remove-cart-item.use-case';
import { MergeCartUseCase } from '../../../application/use-cases/merge-cart.use-case';
import { CustomerContextService } from '../../../../../core/services/customer-context.service';
import { CartResponseDto } from '../../dtos/cart-response.dto';

describe('CartController (Presentation TDD)', () => {
  let controller: CartController;
  let mockAddToCartUseCase: jest.Mocked<AddToCartUseCase>;
  let mockGetCartUseCase: jest.Mocked<GetCartUseCase>;
  let mockUpdateCartItemUseCase: jest.Mocked<UpdateCartItemUseCase>;
  let mockRemoveCartItemUseCase: jest.Mocked<RemoveCartItemUseCase>;
  let mockMergeCartUseCase: jest.Mocked<MergeCartUseCase>;
  let mockCustomerContext: jest.Mocked<CustomerContextService>;

  const mockCartResponse: CartResponseDto = {
    id: 'cart-1',
    customerId: 'cust-1',
    sessionId: null,
    storeId: null,
    items: [],
    unavailableItems: [],
    totalQuantity: 2,
    subtotal: 500000,
    selectedQuantity: 2,
    selectedSubtotal: 500000,
    hasPriceChanges: false,
  };

  beforeEach(() => {
    mockAddToCartUseCase = { execute: jest.fn() } as any;
    mockGetCartUseCase = { execute: jest.fn() } as any;
    mockUpdateCartItemUseCase = { execute: jest.fn() } as any;
    mockRemoveCartItemUseCase = { execute: jest.fn() } as any;
    mockMergeCartUseCase = { execute: jest.fn() } as any;
    mockCustomerContext = { getCustomerIdFromUserId: jest.fn() } as any;

    controller = new CartController(
      mockAddToCartUseCase,
      mockGetCartUseCase,
      mockUpdateCartItemUseCase,
      mockRemoveCartItemUseCase,
      mockMergeCartUseCase,
      mockCustomerContext,
    );
  });

  it('should call AddToCartUseCase (void) then GetCartUseCase for response', async () => {
    mockCustomerContext.getCustomerIdFromUserId.mockResolvedValue('cust-1');
    mockAddToCartUseCase.execute.mockResolvedValue(undefined);
    mockGetCartUseCase.execute.mockResolvedValue(mockCartResponse);

    const res = await controller.addToCart(
      { user: { userId: 'u-1' } },
      { productVariantId: 'var-1', quantity: 2 },
    );

    expect(mockAddToCartUseCase.execute).toHaveBeenCalledWith({
      customerId: 'cust-1',
      sessionId: undefined,
      productVariantId: 'var-1',
      quantity: 2,
      storeId: undefined,
    });
    expect(mockGetCartUseCase.execute).toHaveBeenCalledTimes(1);
    expect(res.subtotal).toBe(500000);
  });

  it('should call GetCartUseCase for guest with session header', async () => {
    const guestResponse: CartResponseDto = {
      ...mockCartResponse,
      id: 'cart-guest',
      customerId: null,
      sessionId: 'sess-abc',
      totalQuantity: 0,
      subtotal: 0,
      selectedQuantity: 0,
      selectedSubtotal: 0,
    };
    mockGetCartUseCase.execute.mockResolvedValue(guestResponse);

    const res = await controller.getCart({}, 'sess-abc');
    expect(mockGetCartUseCase.execute).toHaveBeenCalledWith({
      customerId: undefined,
      sessionId: 'sess-abc',
    });
    expect(res.id).toBe('cart-guest');
  });

  it('should call UpdateCartItemUseCase (void) then GetCartUseCase', async () => {
    mockCustomerContext.getCustomerIdFromUserId.mockResolvedValue('cust-1');
    mockUpdateCartItemUseCase.execute.mockResolvedValue(undefined);
    mockGetCartUseCase.execute.mockResolvedValue(mockCartResponse);

    const res = await controller.updateCartItem(
      { user: { userId: 'u-1' } },
      'item-1',
      { quantity: 3, isSelected: true },
    );

    expect(mockUpdateCartItemUseCase.execute).toHaveBeenCalledWith({
      cartItemId: 'item-1',
      quantity: 3,
      isSelected: true,
      customerId: 'cust-1',
      sessionId: undefined,
    });
    expect(mockGetCartUseCase.execute).toHaveBeenCalledTimes(1);
    expect(res).toEqual(mockCartResponse);
  });

  it('should call RemoveCartItemUseCase (void) then GetCartUseCase', async () => {
    mockCustomerContext.getCustomerIdFromUserId.mockResolvedValue('cust-1');
    mockRemoveCartItemUseCase.execute.mockResolvedValue(undefined);
    mockGetCartUseCase.execute.mockResolvedValue({
      ...mockCartResponse,
      items: [],
      totalQuantity: 0,
      subtotal: 0,
      selectedQuantity: 0,
      selectedSubtotal: 0,
    });

    const res = await controller.removeCartItem(
      { user: { userId: 'u-1' } },
      'item-1',
    );

    expect(mockRemoveCartItemUseCase.execute).toHaveBeenCalledWith({
      cartItemId: 'item-1',
      customerId: 'cust-1',
      sessionId: undefined,
    });
    expect(res.totalQuantity).toBe(0);
  });

  it('should call MergeCartUseCase (void) then GetCartUseCase', async () => {
    mockCustomerContext.getCustomerIdFromUserId.mockResolvedValue('cust-1');
    mockMergeCartUseCase.execute.mockResolvedValue(undefined);
    mockGetCartUseCase.execute.mockResolvedValue({
      ...mockCartResponse,
      totalQuantity: 3,
      subtotal: 600000,
      selectedQuantity: 3,
      selectedSubtotal: 600000,
    });

    const res = await controller.mergeCart(
      { user: { userId: 'u-1' } },
      { sessionId: 'sess-guest' },
    );

    expect(mockMergeCartUseCase.execute).toHaveBeenCalledWith({
      sessionId: 'sess-guest',
      customerId: 'cust-1',
    });
    expect(res.totalQuantity).toBe(3);
  });

  it('should handle guest adding to cart via session id', async () => {
    mockAddToCartUseCase.execute.mockResolvedValue(undefined);
    mockGetCartUseCase.execute.mockResolvedValue({
      ...mockCartResponse,
      customerId: null,
      sessionId: 'sess-guest',
    });

    const res = await controller.addToCart(
      { headers: {} },
      { productVariantId: 'var-1', quantity: 1, sessionId: 'sess-guest' },
    );

    expect(mockAddToCartUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: 'sess-guest',
        customerId: undefined,
      }),
    );
    expect(res.sessionId).toBe('sess-guest');
  });
});
