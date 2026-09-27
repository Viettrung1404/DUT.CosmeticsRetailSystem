import { Test, TestingModule } from '@nestjs/testing';
import { CustomerOrderController } from '../order-customer.controller';
import { PreviewOrderUseCase } from '../../../application/use-cases/preview-order.use-case';
import { CreateOrderUseCase } from '../../../application/use-cases/create-order.use-case';
import { GetCustomerOrdersUseCase } from '../../../application/use-cases/get-customer-orders.use-case';
import { GetOrderDetailUseCase } from '../../../application/use-cases/get-order-detail.use-case';
import { CancelOrderUseCase } from '../../../application/use-cases/cancel-order.use-case';
import { CustomerContextService } from '../../../../../core/services/customer-context.service';
import { JwtAuthGuard } from '../../../../../core/guards/jwt-auth.guard';

describe('CustomerOrderController (TDD)', () => {
  let controller: CustomerOrderController;
  let mockPreviewUseCase: jest.Mocked<PreviewOrderUseCase>;
  let mockCreateUseCase: jest.Mocked<CreateOrderUseCase>;
  let mockGetOrdersUseCase: jest.Mocked<GetCustomerOrdersUseCase>;
  let mockGetDetailUseCase: jest.Mocked<GetOrderDetailUseCase>;
  let mockCancelUseCase: jest.Mocked<CancelOrderUseCase>;
  let mockCustomerContext: jest.Mocked<CustomerContextService>;

  beforeEach(async () => {
    mockPreviewUseCase = { execute: jest.fn() } as any;
    mockCreateUseCase = { execute: jest.fn() } as any;
    mockGetOrdersUseCase = { execute: jest.fn() } as any;
    mockGetDetailUseCase = { execute: jest.fn() } as any;
    mockCancelUseCase = { execute: jest.fn() } as any;
    mockCustomerContext = { getCustomerIdFromUserId: jest.fn() } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CustomerOrderController],
      providers: [
        { provide: PreviewOrderUseCase, useValue: mockPreviewUseCase },
        { provide: CreateOrderUseCase, useValue: mockCreateUseCase },
        { provide: GetCustomerOrdersUseCase, useValue: mockGetOrdersUseCase },
        { provide: GetOrderDetailUseCase, useValue: mockGetDetailUseCase },
        { provide: CancelOrderUseCase, useValue: mockCancelUseCase },
        { provide: CustomerContextService, useValue: mockCustomerContext },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<CustomerOrderController>(CustomerOrderController);
  });

  const mockReq = { user: { id: 'usr-1' } };

  it('should preview order successfully', async () => {
    mockCustomerContext.getCustomerIdFromUserId.mockResolvedValue('cust-1');
    mockPreviewUseCase.execute.mockResolvedValue({
      subtotal: 500000,
      shippingFee: 0,
      discountAmount: 0,
      pointsDiscount: 0,
      totalAmount: 500000,
      storeId: 'store-1',
      items: [],
    });

    const result = await controller.previewOrder(mockReq as any, {
      couponCode: 'SALE10',
    });

    expect(mockCustomerContext.getCustomerIdFromUserId).toHaveBeenCalledWith(
      'usr-1',
    );
    expect(mockPreviewUseCase.execute).toHaveBeenCalledWith({
      customerId: 'cust-1',
      couponCode: 'SALE10',
    });
    expect(result.data.totalAmount).toBe(500000);
  });

  it('should create order successfully', async () => {
    mockCustomerContext.getCustomerIdFromUserId.mockResolvedValue('cust-1');
    mockCreateUseCase.execute.mockResolvedValue({
      id: 'ord-1',
      orderNumber: 'ORD202609270001',
    } as any);

    const dto = {
      shippingAddress: {
        recipientName: 'Nam',
        phone: '0901234567',
        addressLine: '123 Đường A',
        city: 'Đà Nẵng',
      },
    };

    const result = await controller.createOrder(mockReq as any, dto);

    expect(mockCreateUseCase.execute).toHaveBeenCalledWith({
      customerId: 'cust-1',
      shippingAddress: dto.shippingAddress,
      paymentMethod: undefined,
      items: undefined,
      couponCode: undefined,
      usePoints: undefined,
      storeId: undefined,
      note: undefined,
    });
    expect(result.data.id).toBe('ord-1');
  });

  it('should get customer orders list', async () => {
    mockCustomerContext.getCustomerIdFromUserId.mockResolvedValue('cust-1');
    mockGetOrdersUseCase.execute.mockResolvedValue({
      orders: [],
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 1,
    });

    const result = await controller.getCustomerOrders(mockReq as any, {
      page: 1,
      limit: 10,
    });

    expect(mockGetOrdersUseCase.execute).toHaveBeenCalledWith({
      customerId: 'cust-1',
      page: 1,
      limit: 10,
      status: undefined,
    });
    expect(result.data).toBeDefined();
  });

  it('should get order detail', async () => {
    mockCustomerContext.getCustomerIdFromUserId.mockResolvedValue('cust-1');
    mockGetDetailUseCase.execute.mockResolvedValue({
      id: 'ord-1',
      orderNumber: 'ORD202609270001',
    } as any);

    const result = await controller.getOrderDetail(mockReq as any, 'ord-1');

    expect(mockGetDetailUseCase.execute).toHaveBeenCalledWith('ord-1', 'cust-1');
    expect(result.data.id).toBe('ord-1');
  });

  it('should cancel order successfully', async () => {
    mockCustomerContext.getCustomerIdFromUserId.mockResolvedValue('cust-1');
    mockCancelUseCase.execute.mockResolvedValue({
      id: 'ord-1',
      status: 'CANCELLED',
    } as any);

    const result = await controller.cancelOrder(mockReq as any, 'ord-1', {
      reason: 'Đổi ý',
    });

    expect(mockCancelUseCase.execute).toHaveBeenCalledWith({
      orderId: 'ord-1',
      customerId: 'cust-1',
      reason: 'Đổi ý',
    });
    expect(result.data.status).toBe('CANCELLED');
  });
});
