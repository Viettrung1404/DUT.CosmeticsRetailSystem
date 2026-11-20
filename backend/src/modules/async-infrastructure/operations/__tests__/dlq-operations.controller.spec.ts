import { DlqOperationsController } from '../dlq-operations.controller';
import { DlqOperationsService } from '../dlq-operations.service';

describe('DlqOperationsController (EP12-T02)', () => {
  let controller: DlqOperationsController;
  let mockService: any;

  beforeEach(() => {
    mockService = {
      listDlqMessages: jest.fn().mockResolvedValue({
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
        data: [{ id: 'inbox-1', carrierCode: 'GHN', processedStatus: 'FAILED' }],
      }),
      replayMessages: jest.fn().mockResolvedValue({
        totalRequested: 1,
        successCount: 1,
        failedCount: 0,
        details: [{ inboxId: 'inbox-1', status: 'PROCESSED' }],
      }),
      retryStuckOutboxEvents: jest.fn().mockResolvedValue({
        resetCount: 3,
        message: 'Success',
      }),
    };

    controller = new DlqOperationsController(mockService as DlqOperationsService);
  });

  it('should list DLQ messages with query params', async () => {
    const query = { page: 1, limit: 10, carrierCode: 'GHN' };
    const res = await controller.listDlqMessages(query);

    expect(mockService.listDlqMessages).toHaveBeenCalledWith(query);
    expect(res.total).toBe(1);
    expect(res.data[0].id).toBe('inbox-1');
  });

  it('should replay DLQ messages', async () => {
    const dto = { inboxId: 'inbox-1' };
    const res = await controller.replayMessages(dto);

    expect(mockService.replayMessages).toHaveBeenCalledWith(dto);
    expect(res.successCount).toBe(1);
  });

  it('should retry stuck outbox events', async () => {
    const dto = { thresholdRetries: 5 };
    const res = await controller.retryStuckOutbox(dto);

    expect(mockService.retryStuckOutboxEvents).toHaveBeenCalledWith(dto);
    expect(res.resetCount).toBe(3);
  });

  it('should have route path without duplicate api/v1 prefix (BE-01)', () => {
    const path = Reflect.getMetadata('path', DlqOperationsController);
    expect(path).toBe('admin/operations');
    expect(path).not.toContain('api/v1');
  });
});
