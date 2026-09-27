import { CancelExpiredOrdersUseCase } from '../cancel-expired-orders.use-case';
import { IOrderRepository } from '../../../domain/repositories/order.repository.interface';

describe('CancelExpiredOrdersUseCase (TDD)', () => {
  let useCase: CancelExpiredOrdersUseCase;
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

    useCase = new CancelExpiredOrdersUseCase(mockOrderRepo);
  });

  it('should call cancelExpiredPendingOrders with cutoff timestamp 30 minutes in the past', async () => {
    mockOrderRepo.cancelExpiredPendingOrders.mockResolvedValue(3);

    const cancelledCount = await useCase.execute();

    expect(cancelledCount).toBe(3);
    expect(mockOrderRepo.cancelExpiredPendingOrders).toHaveBeenCalledTimes(1);

    const calledCutoff = mockOrderRepo.cancelExpiredPendingOrders.mock.calls[0][0];
    const diffMinutes = (Date.now() - calledCutoff.getTime()) / (1000 * 60);

    // Difference should be approx 30 minutes (between 29.9 and 30.1 min)
    expect(diffMinutes).toBeGreaterThanOrEqual(29.9);
    expect(diffMinutes).toBeLessThanOrEqual(30.1);
  });
});
