import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { CancelOrderUseCase } from '../cancel-order.use-case';
import { IOrderRepository } from '../../../domain/repositories/order.repository.interface';
import { OrderEntity } from '../../../domain/entities/order.entity';
import { OrderStatus } from '../../../../../core/domain/orders/order-status.enum';

describe('CancelOrderUseCase (TDD)', () => {
  let useCase: CancelOrderUseCase;
  let mockOrderRepo: jest.Mocked<IOrderRepository>;

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

    useCase = new CancelOrderUseCase(mockOrderRepo);
  });

  it('should cancel order successfully when order is in PENDING status', async () => {
    const existingOrder = new OrderEntity({
      id: 'ord-1',
      customerId: 'cust-1',
      status: OrderStatus.PENDING,
    } as any);

    mockOrderRepo.findById.mockResolvedValue(existingOrder);
    mockOrderRepo.cancelOrderWithTransaction.mockResolvedValue(
      new OrderEntity({ ...existingOrder, status: OrderStatus.CANCELLED }),
    );

    const result = await useCase.execute({
      orderId: 'ord-1',
      customerId: 'cust-1',
      reason: 'Đổi ý không mua nữa',
    });

    expect(result.status).toBe('CANCELLED');
    expect(mockOrderRepo.cancelOrderWithTransaction).toHaveBeenCalledWith(
      'ord-1',
      'cust-1',
      'Đổi ý không mua nữa',
    );
  });

  it('should throw NotFoundException if order does not exist', async () => {
    mockOrderRepo.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({ orderId: 'non-existing', customerId: 'cust-1' }),
    ).rejects.toThrow(new NotFoundException('Không tìm thấy đơn hàng'));
  });

  it('should throw ForbiddenException if order belongs to another customer (IDOR check)', async () => {
    const existingOrder = new OrderEntity({
      id: 'ord-1',
      customerId: 'cust-other',
      status: 'PENDING',
    } as any);

    mockOrderRepo.findById.mockResolvedValue(existingOrder);

    await expect(
      useCase.execute({ orderId: 'ord-1', customerId: 'cust-1' }),
    ).rejects.toThrow(new ForbiddenException('Bạn không có quyền hủy đơn hàng này'));
  });

  it('should throw BadRequestException if order status is not PENDING (e.g. PROCESSING, SHIPPING)', async () => {
    const existingOrder = new OrderEntity({
      id: 'ord-1',
      customerId: 'cust-1',
      status: 'PROCESSING',
    } as any);

    mockOrderRepo.findById.mockResolvedValue(existingOrder);

    await expect(
      useCase.execute({ orderId: 'ord-1', customerId: 'cust-1' }),
    ).rejects.toThrow(
      new BadRequestException(
        'Không thể chuyển trạng thái đơn hàng từ PROCESSING sang CANCELLED bởi vai trò CUSTOMER',
      ),
    );
  });
});
