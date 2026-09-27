import { BadRequestException } from '@nestjs/common';
import { PreviewOrderUseCase } from '../preview-order.use-case';
import { IOrderRepository } from '../../../domain/repositories/order.repository.interface';
import { OrderPricingService } from '../../services/order-pricing.service';
import { StoreResolverService } from '../../services/store-resolver.service';

describe('PreviewOrderUseCase (TDD)', () => {
  let useCase: PreviewOrderUseCase;
  let mockOrderRepo: jest.Mocked<IOrderRepository>;
  let mockPricingService: jest.Mocked<OrderPricingService>;
  let mockStoreResolver: jest.Mocked<StoreResolverService>;
  let mockVariantCatalogProvider: any;
  let mockCartRepository: any;

  beforeEach(() => {
    mockOrderRepo = {
      createOrderWithTransaction: jest.fn(),
      findById: jest.fn(),
      findByOrderNumber: jest.fn(),
      findCustomerOrders: jest.fn(),
      cancelOrderWithTransaction: jest.fn(),
      cancelExpiredPendingOrders: jest.fn(),
      getNextOrderSequence: jest.fn(),
      getCustomerCouponUsageCount: jest.fn(),
      findCouponByCode: jest.fn(),
      getCustomerPoints: jest.fn(),
    };

    mockPricingService = {
      calculatePricing: jest.fn(),
    } as any;

    mockStoreResolver = {
      resolveStoreForOrder: jest.fn(),
    } as any;

    mockVariantCatalogProvider = {
      getVariantsDetails: jest.fn(),
    };

    mockCartRepository = {
      findCart: jest.fn(),
    };

    useCase = new PreviewOrderUseCase(
      mockOrderRepo,
      mockPricingService,
      mockStoreResolver,
      mockVariantCatalogProvider,
      mockCartRepository,
    );
  });

  it('should preview order from cart items if no items provided in request', async () => {
    const customerId = 'cust-1';

    mockCartRepository.findCart.mockResolvedValue({
      id: 'cart-1',
      items: [{ productVariantId: 'var-1', quantity: 2 }],
    });

    mockStoreResolver.resolveStoreForOrder.mockResolvedValue('store-online');

    mockVariantCatalogProvider.getVariantsDetails.mockResolvedValue([
      {
        id: 'var-1',
        productName: 'Son kem lì Merzy',
        option1Value: 'Đỏ đất',
        unitPrice: 150000,
        unitCost: 80000,
        sku: 'MERZY-01',
      },
    ]);

    mockOrderRepo.getCustomerPoints.mockResolvedValue(50);

    mockPricingService.calculatePricing.mockReturnValue({
      subtotal: 300000,
      shippingFee: 30000,
      discountAmount: 0,
      pointsDiscount: 0,
      totalAmount: 330000,
    });

    const result = await useCase.execute({
      customerId,
    });

    expect(result.subtotal).toBe(300000);
    expect(result.shippingFee).toBe(30000);
    expect(result.totalAmount).toBe(330000);
    expect(result.storeId).toBe('store-online');
    expect(result.items).toHaveLength(1);
    expect(result.items[0].variantName).toBe('Đỏ đất');
  });

  it('should throw BadRequestException if cart is empty and no items specified', async () => {
    mockCartRepository.findCart.mockResolvedValue({
      id: 'cart-1',
      items: [],
    });

    await expect(
      useCase.execute({
        customerId: 'cust-1',
      }),
    ).rejects.toThrow(new BadRequestException('Giỏ hàng của bạn đang trống'));
  });
});
