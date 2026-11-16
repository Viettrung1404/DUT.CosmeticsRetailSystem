import { AdminFulfillmentQueueController } from '../admin-fulfillment-queue.controller';
import { FulfillmentQueueService } from '../../../application/services/fulfillment-queue.service';

describe('AdminFulfillmentQueueController (EP11-T02)', () => {
  let controller: AdminFulfillmentQueueController;
  let queueService: jest.Mocked<FulfillmentQueueService>;

  beforeEach(() => {
    queueService = {
      getPickingTasks: jest.fn(),
      getPackingTasks: jest.fn(),
      getHandoverTasks: jest.fn(),
    } as any;

    controller = new AdminFulfillmentQueueController(queueService);
  });

  const mockUser = { userId: 'u1', roleName: 'STAFF' };

  it('1. getPickingTasks gọi đúng queueService.getPickingTasks', async () => {
    const expected = { items: [], total: 0, page: 1, limit: 20, totalPages: 0 };
    queueService.getPickingTasks.mockResolvedValue(expected);

    const result = await controller.getPickingTasks(mockUser, { page: 1 });
    expect(result).toBe(expected);
    expect(queueService.getPickingTasks).toHaveBeenCalledWith(mockUser, { page: 1 });
  });

  it('2. getPackingTasks gọi đúng queueService.getPackingTasks', async () => {
    const expected = { items: [], total: 0, page: 1, limit: 20, totalPages: 0 };
    queueService.getPackingTasks.mockResolvedValue(expected);

    const result = await controller.getPackingTasks(mockUser, { page: 1 });
    expect(result).toBe(expected);
    expect(queueService.getPackingTasks).toHaveBeenCalledWith(mockUser, { page: 1 });
  });

  it('3. getHandoverTasks gọi đúng queueService.getHandoverTasks', async () => {
    const expected = { items: [], total: 0, page: 1, limit: 20, totalPages: 0 };
    queueService.getHandoverTasks.mockResolvedValue(expected);

    const result = await controller.getHandoverTasks(mockUser, { page: 1 });
    expect(result).toBe(expected);
    expect(queueService.getHandoverTasks).toHaveBeenCalledWith(mockUser, { page: 1 });
  });
});
