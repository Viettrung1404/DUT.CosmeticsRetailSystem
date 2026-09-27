import { CartController } from '../cart.controller';
import { AddToCartUseCase } from '../../../application/use-cases/add-to-cart.use-case';
import { GetCartUseCase } from '../../../application/use-cases/get-cart.use-case';
import { UpdateCartItemUseCase } from '../../../application/use-cases/update-cart-item.use-case';
import { RemoveCartItemUseCase } from '../../../application/use-cases/remove-cart-item.use-case';
import { MergeCartUseCase } from '../../../application/use-cases/merge-cart.use-case';
import { CustomerContextService } from '../../../../../core/services/customer-context.service';
import { CartEntity } from '../../../domain/entities/cart.entity';

describe('CartController (Presentation TDD)', () => {
  let controller: CartController;
  let mockAddToCartUseCase: jest.Mocked<AddToCartUseCase>;
  let mockGetCartUseCase: jest.Mocked<GetCartUseCase>;
  let mockUpdateCartItemUseCase: jest.Mocked<UpdateCartItemUseCase>;
  let mockRemoveCartItemUseCase: jest.Mocked<RemoveCartItemUseCase>;
  let mockMergeCartUseCase: jest.Mocked<MergeCartUseCase>;
  let mockCustomerContext: jest.Mocked<CustomerContextService>;

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

  it('should call AddToCartUseCase and return updated cart', async () => {
    mockCustomerContext.getCustomerIdFromUserId.mockResolvedValue('cust-1');
    mockAddToCartUseCase.execute.mockResolvedValue(new CartEntity({ id: 'cart-1', customerId: 'cust-1' }));
    mockGetCartUseCase.execute.mockResolvedValue({
      id: 'cart-1',
      customerId: 'cust-1',
      sessionId: null,
      storeId: null,
      items: [],
      totalQuantity: 2,
      subtotal: 500000,
    });

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
    expect(res.subtotal).toBe(500000);
  });

  it('should call GetCartUseCase for guest with session header', async () => {
    mockGetCartUseCase.execute.mockResolvedValue({
      id: 'cart-guest',
      customerId: null,
      sessionId: 'sess-abc',
      storeId: null,
      items: [],
      totalQuantity: 0,
      subtotal: 0,
    });

    const res = await controller.getCart({}, 'sess-abc');
    expect(mockGetCartUseCase.execute).toHaveBeenCalledWith({
      customerId: undefined,
      sessionId: 'sess-abc',
    });
    expect(res.id).toBe('cart-guest');
  });

  it('should call MergeCartUseCase with logged-in user customerId', async () => {
    mockCustomerContext.getCustomerIdFromUserId.mockResolvedValue('cust-1');
    mockMergeCartUseCase.execute.mockResolvedValue(new CartEntity({ id: 'cart-cust', customerId: 'cust-1' }));
    mockGetCartUseCase.execute.mockResolvedValue({
      id: 'cart-cust',
      customerId: 'cust-1',
      sessionId: null,
      storeId: null,
      items: [],
      totalQuantity: 3,
      subtotal: 600000,
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
});
