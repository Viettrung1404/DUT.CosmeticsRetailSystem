import {
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { CreateOrderUseCase } from '../create-order.use-case';
import { IOrderRepository } from '../../../domain/repositories/order.repository.interface';
import { OrderPricingService } from '../../services/order-pricing.service';
import { StoreResolverService } from '../../services/store-resolver.service';
import { OrderEntity } from '../../../domain/entities/order.entity';
import { OrderStatus } from '../../../../../core/domain/orders/order-status.enum';

describe('CreateOrderUseCase (TDD & BE-03 Shipping Quote Integration)', () => {
  let useCase: CreateOrderUseCase;
  let mockOrderRepo: jest.Mocked<IOrderRepository>;
  let mockPricingService: jest.Mocked<OrderPricingService>;
  let mockStoreResolver: jest.Mocked<StoreResolverService>;
  let mockVariantCatalogProvider: any;
  let mockCartRepository: any;
  let mockShippingQuoteService: any;

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
      configuredPointValue: jest.fn().mockResolvedValue(1),
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

    mockShippingQuoteService = {
      validateQuote: jest.fn(),
    };

    useCase = new CreateOrderUseCase(
      mockOrderRepo,
      mockPricingService,
      mockStoreResolver,
      mockVariantCatalogProvider,
      mockCartRepository,
      undefined, // commerce fallback path to test useCase logic directly
      mockShippingQuoteService,
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

    expect(mockOrderRepo.createOrderWithTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ cartId: 'cart-1' }),
    );
    expect(mockCartRepository.clearCart).not.toHaveBeenCalled();
  });

  describe('BE-03: Real Shipping Quotes Integration', () => {
    const customerId = 'cust-123';
    const shippingAddress = {
      recipientName: 'Lê Văn C',
      phone: '0911223344',
      addressLine: '789 Trần Hưng Đạo',
      city: 'Đà Nẵng',
    };

    beforeEach(() => {
      mockStoreResolver.resolveStoreForOrder.mockResolvedValue('store-dn');
      mockOrderRepo.getNextOrderSequence.mockResolvedValue(10);
      mockVariantCatalogProvider.getVariantsDetails.mockResolvedValue([
        {
          id: 'var-1',
          productName: 'Toner Klairs',
          option1Value: '150ml',
          unitPrice: 250000,
          unitCost: 150000,
          sku: 'KLAIRS-150',
        },
      ]);
      mockPricingService.calculatePricing.mockReturnValue({
        subtotal: 250000,
        shippingFee: 40000, // Policy estimated fee
        discountAmount: 0,
        pointsDiscount: 0,
        totalAmount: 290000,
      });
      mockOrderRepo.createOrderWithTransaction.mockResolvedValue(
        new OrderEntity({
          id: 'ord-be03',
          orderNumber: 'ORD202611190010',
        } as any),
      );
    });

    it('1. should validate real shipping quote and replace shipping fee from quote (BE-03)', async () => {
      mockShippingQuoteService.validateQuote.mockResolvedValue({
        quoteGroupId: 'quote-grp-1',
        serviceCode: 'GHN_STANDARD',
        estimatedFee: 22000, // Real quote fee (lower than initial policy 40000)
      });

      await useCase.execute({
        customerId,
        shippingAddress,
        paymentMethod: 'COD',
        items: [{ variantId: 'var-1', quantity: 1 }],
        quoteGroupId: 'quote-grp-1',
        shippingOptionId: 'GHN_STANDARD',
      });

      expect(mockShippingQuoteService.validateQuote).toHaveBeenCalledWith(
        'quote-grp-1',
        'GHN_STANDARD',
        'store-dn',
      );
      expect(mockOrderRepo.createOrderWithTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          shippingFee: 22000,
          totalAmount: 272000, // 250000 + 22000
        }),
      );
    });

    it('2. should reject with 422 SHIPPING_QUOTE_EXPIRED when quote has expired', async () => {
      mockShippingQuoteService.validateQuote.mockRejectedValue(
        new HttpException(
          { code: 'SHIPPING_QUOTE_EXPIRED', message: 'Quote expired' },
          HttpStatus.UNPROCESSABLE_ENTITY,
        ),
      );

      await expect(
        useCase.execute({
          customerId,
          shippingAddress,
          paymentMethod: 'COD',
          items: [{ variantId: 'var-1', quantity: 1 }],
          quoteGroupId: 'expired-quote',
          shippingOptionId: 'GHN_STANDARD',
        }),
      ).rejects.toThrow(HttpException);
    });

    it('3. should reject with BadRequestException when quoteGroupId is provided without shippingOptionId', async () => {
      await expect(
        useCase.execute({
          customerId,
          shippingAddress,
          paymentMethod: 'COD',
          items: [{ variantId: 'var-1', quantity: 1 }],
          quoteGroupId: 'quote-grp-1',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('4. should preserve default fee calculation when quoteGroupId is omitted (backward-compatibility)', async () => {
      await useCase.execute({
        customerId,
        shippingAddress,
        paymentMethod: 'COD',
        items: [{ variantId: 'var-1', quantity: 1 }],
      });

      expect(mockShippingQuoteService.validateQuote).not.toHaveBeenCalled();
      expect(mockOrderRepo.createOrderWithTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          shippingFee: 40000,
          totalAmount: 290000,
        }),
      );
    });
  });
});
