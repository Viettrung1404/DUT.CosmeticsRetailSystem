import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { GetOrderDetailUseCase } from '../get-order-detail.use-case';
import { GetCustomerOrdersUseCase } from '../get-customer-orders.use-case';
import { IOrderRepository } from '../../../domain/repositories/order.repository.interface';
import { OrderEntity } from '../../../domain/entities/order.entity';

describe('Order Query Use Cases (TDD)', () => {
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
  });

  describe('GetOrderDetailUseCase', () => {
    let useCase: GetOrderDetailUseCase;

    beforeEach(() => {
      useCase = new GetOrderDetailUseCase(mockOrderRepo);
    });

    it('should return order when customerId matches', async () => {
      const order = new OrderEntity({
        id: 'ord-1',
        customerId: 'cust-1',
        totalAmount: 500000,
      } as any);

      mockOrderRepo.findById.mockResolvedValue(order);

      const result = await useCase.execute('ord-1', 'cust-1');
      expect(result.id).toBe('ord-1');
      expect(result.totalAmount).toBe(500000);
    });

    it('should throw NotFoundException if order does not exist', async () => {
      mockOrderRepo.findById.mockResolvedValue(null);

      await expect(useCase.execute('ord-999', 'cust-1')).rejects.toThrow(
        new NotFoundException('Không tìm thấy đơn hàng'),
      );
    });

    it('should throw ForbiddenException if order belongs to another customer (IDOR protection)', async () => {
      const order = new OrderEntity({
        id: 'ord-1',
        customerId: 'cust-2',
      } as any);

      mockOrderRepo.findById.mockResolvedValue(order);

      await expect(useCase.execute('ord-1', 'cust-1')).rejects.toThrow(
        new ForbiddenException('Bạn không có quyền xem thông tin đơn hàng này'),
      );
    });
  });

  describe('GetCustomerOrdersUseCase', () => {
    let useCase: GetCustomerOrdersUseCase;

    beforeEach(() => {
      useCase = new GetCustomerOrdersUseCase(mockOrderRepo);
    });

    it('should return list of orders and pagination for customer', async () => {
      const orders = [
        new OrderEntity({ id: 'ord-1', orderNumber: 'ORD202609270001' } as any),
        new OrderEntity({ id: 'ord-2', orderNumber: 'ORD202609270002' } as any),
      ];

      mockOrderRepo.findCustomerOrders.mockResolvedValue({
        orders,
        total: 2,
      });

      const result = await useCase.execute({
        customerId: 'cust-1',
        page: 1,
        limit: 10,
      });

      expect(result.orders).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(mockOrderRepo.findCustomerOrders).toHaveBeenCalledWith('cust-1', {
        page: 1,
        limit: 10,
        status: undefined,
      });
    });
  });
});
