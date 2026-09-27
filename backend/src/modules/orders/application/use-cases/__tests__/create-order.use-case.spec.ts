import { BadRequestException } from '@nestjs/common';
import { CreateOrderUseCase } from '../create-order.use-case';
import { IOrderRepository } from '../../../domain/repositories/order.repository.interface';
import { OrderPricingService } from '../../services/order-pricing.service';
import { StoreResolverService } from '../../services/store-resolver.service';
import { OrderEntity } from '../../../domain/entities/order.entity';
import { OrderStatus } from '../../../../../core/domain/orders/order-status.enum';

describe('CreateOrderUseCase (TDD)', () => {
  let useCase: CreateOrderUseCase;
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
      clearCart: jest.fn(),
    };

    useCase = new CreateOrderUseCase(
      mockOrderRepo,
      mockPricingService,
      mockStoreResolver,
      mockVariantCatalogProvider,
      mockCartRepository,
    );
  });

  it('should create order successfully with COD payment and resolved store', async () => {
    const customerId = 'cust-123';
    const shippingAddress = {
      recipientName: 'Nguyễn Văn A',
      phone: '0901234567',
      addressLine: '123 Lê Duẩn',
      district: 'Hải Châu',
      city: 'Đà Nẵng',
    };

    mockStoreResolver.resolveStoreForOrder.mockResolvedValue('store-online');
    mockOrderRepo.getNextOrderSequence.mockResolvedValue(1);

    mockVariantCatalogProvider.getVariantsDetails.mockResolvedValue([
      {
        id: 'var-1',
        productName: 'Kem dưỡng ẩm Cetaphil',
        option1Value: '50ml',
        unitPrice: 200000,
        unitCost: 120000,
        sku: 'CET-50',
      },
    ]);

    mockPricingService.calculatePricing.mockReturnValue({
      subtotal: 200000,
      shippingFee: 30000,
      discountAmount: 0,
      pointsDiscount: 0,
      totalAmount: 230000,
    });

    const expectedOrder = new OrderEntity({
      id: 'ord-1',
      orderNumber: 'ORD202609270001',
      customerId,
      storeId: 'store-online',
      orderType: 'ONLINE',
      status: OrderStatus.PENDING,
      subtotal: 200000,
      discountAmount: 0,
      shippingFee: 30000,
      taxAmount: 0,
      totalAmount: 230000,
      shippingAddress,
      billingAddress: null,
      note: 'Giao giờ hành chính',
      couponId: null,
      loyaltyPointsUsed: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      items: [],
    });

    mockOrderRepo.createOrderWithTransaction.mockResolvedValue(expectedOrder);

    const result = await useCase.execute({
      customerId,
      shippingAddress,
      paymentMethod: 'COD',
      items: [{ variantId: 'var-1', quantity: 1 }],
      note: 'Giao giờ hành chính',
    });

    expect(result.id).toBe('ord-1');
    expect(result.orderNumber).toMatch(/^ORD\d{12}$/); // ORDYYYYMMDDXXXX
    expect(mockOrderRepo.createOrderWithTransaction).toHaveBeenCalledTimes(1);
    expect(mockStoreResolver.resolveStoreForOrder).toHaveBeenCalledWith({
      requestedStoreId: undefined,
      items: [{ variantId: 'var-1', quantity: 1 }],
    });
  });

  it('should take items from cart and clear cart when items are not provided', async () => {
    const customerId = 'cust-123';
    mockCartRepository.findCart.mockResolvedValue({
      id: 'cart-1',
      items: [{ productVariantId: 'var-1', quantity: 2 }],
    });

    mockStoreResolver.resolveStoreForOrder.mockResolvedValue('store-1');
    mockOrderRepo.getNextOrderSequence.mockResolvedValue(2);

    mockVariantCatalogProvider.getVariantsDetails.mockResolvedValue([
      {
        id: 'var-1',
        productName: 'Son dưỡng DHC',
        option1Value: 'Không màu',
        unitPrice: 150000,
        unitCost: 80000,
        sku: 'DHC-01',
      },
    ]);

    mockPricingService.calculatePricing.mockReturnValue({
      subtotal: 300000,
      shippingFee: 30000,
      discountAmount: 0,
      pointsDiscount: 0,
      totalAmount: 330000,
    });

    mockOrderRepo.createOrderWithTransaction.mockResolvedValue(
      new OrderEntity({
        id: 'ord-2',
        orderNumber: 'ORD202609270002',
      } as any),
    );

    await useCase.execute({
      customerId,
      shippingAddress: {
        recipientName: 'Trần Thị B',
        phone: '0907654321',
        addressLine: '456 Nguyễn Huệ',
        city: 'TP.HCM',
      },
      paymentMethod: 'COD',
    });

    expect(mockCartRepository.clearCart).toHaveBeenCalledWith('cart-1');
  });
});
