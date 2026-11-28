import { BadRequestException } from '@nestjs/common';
import { DlqOperationsService } from '../dlq-operations.service';

describe('DlqOperationsService (EP12-T02)', () => {
  let service: DlqOperationsService;
  let mockPrisma: any;
  let mockWebhookProcessor: any;
  let mockDlqAlert: any;

  beforeEach(() => {
    mockPrisma = {
      shippingWebhookInbox: {
        count: jest.fn().mockResolvedValue(2),
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'inbox-1',
            carrierCode: 'GHN',
            eventId: 'evt-1',
            trackingCode: 'TRACK-1',
            processedStatus: 'FAILED',
            errorMessage: 'Shipment not found',
            receivedAt: new Date(),
          },
          {
            id: 'inbox-2',
            carrierCode: 'AHAMOVE',
            eventId: 'evt-2',
            trackingCode: 'TRACK-2',
            processedStatus: 'DEAD_LETTER',
            errorMessage: 'Max retry attempts exceeded',
            receivedAt: new Date(),
          },
        ]),
        findUnique: jest.fn(),
        update: jest.fn().mockImplementation(({ where, data }) =>
          Promise.resolve({ id: where.id, ...data }),
        ),
        upsert: jest.fn().mockImplementation(({ create, update }) =>
          Promise.resolve({ id: 'inbox-dlq-new', ...create }),
        ),
      },
      outboxEvent: {
        findMany: jest.fn().mockResolvedValue([{ id: 'outbox-1' }, { id: 'outbox-2' }]),
        updateMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
    };

    mockWebhookProcessor = {
      processEvent: jest.fn().mockResolvedValue({
        status: 'PROCESSED',
        inboxId: 'inbox-1',
        shipmentId: 'shipment-123',
        newStatus: 'DELIVERED',
      }),
    };

    mockDlqAlert = {
      notifyDlq: jest.fn().mockResolvedValue({ sent: true }),
    };

    service = new DlqOperationsService(
      mockPrisma as any,
      mockWebhookProcessor as any,
      mockDlqAlert as any,
    );
  });

  describe('listDlqMessages', () => {
    it('should query DLQ messages with default FAILED and DEAD_LETTER filter', async () => {
      const result = await service.listDlqMessages({ page: 1, limit: 10 });

      expect(result.total).toBe(2);
      expect(result.data).toHaveLength(2);
      expect(mockPrisma.shippingWebhookInbox.findMany).toHaveBeenCalled();
      const whereClause = mockPrisma.shippingWebhookInbox.findMany.mock.calls[0][0].where;
      expect(whereClause.processedStatus).toEqual({ in: ['FAILED', 'DEAD_LETTER'] });
    });

    it('should filter by carrierCode and specific status', async () => {
      await service.listDlqMessages({
        carrierCode: 'ghn',
        status: 'DEAD_LETTER' as any,
      });

      const whereClause = mockPrisma.shippingWebhookInbox.findMany.mock.calls[0][0].where;
      expect(whereClause.carrierCode).toBe('GHN');
      expect(whereClause.processedStatus).toBe('DEAD_LETTER');
    });
  });

  describe('replayMessages (AC1)', () => {
    it('should throw BadRequestException if neither inboxId nor inboxIds provided', async () => {
      await expect(service.replayMessages({})).rejects.toThrow(BadRequestException);
    });

    it('should idempotently reset to PENDING and trigger webhook processor (AC1)', async () => {
      mockPrisma.shippingWebhookInbox.findUnique.mockResolvedValue({
        id: 'inbox-1',
        carrierCode: 'GHN',
        eventId: 'evt-1',
        trackingCode: 'TRACK-1',
        processedStatus: 'FAILED',
      });

      const result = await service.replayMessages({ inboxId: 'inbox-1' });

      expect(result.totalRequested).toBe(1);
      expect(result.successCount).toBe(1);
      expect(result.failedCount).toBe(0);

      // 1. Verify reset to PENDING
      expect(mockPrisma.shippingWebhookInbox.update).toHaveBeenCalledWith({
        where: { id: 'inbox-1' },
        data: {
          processedStatus: 'PENDING',
          errorMessage: null,
        },
      });

      // 2. Verify processor triggered
      expect(mockWebhookProcessor.processEvent).toHaveBeenCalledWith('inbox-1');
    });

    it('should handle non-existent inbox gracefully', async () => {
      mockPrisma.shippingWebhookInbox.findUnique.mockResolvedValue(null);

      const result = await service.replayMessages({ inboxId: 'non-existent-id' });

      expect(result.totalRequested).toBe(1);
      expect(result.successCount).toBe(0);
      expect(result.failedCount).toBe(1);
      expect(result.details[0].status).toBe('ERROR');
    });
  });

  describe('retryStuckOutboxEvents', () => {
    it('should find stuck outbox events and reset them to PENDING', async () => {
      const result = await service.retryStuckOutboxEvents({ thresholdRetries: 3 });

      expect(result.resetCount).toBe(2);
      expect(mockPrisma.outboxEvent.updateMany).toHaveBeenCalledWith({
        where: {
          id: { in: ['outbox-1', 'outbox-2'] },
        },
        data: {
          status: 'PENDING',
          retryCount: 0,
          lastError: null,
        },
      });
    });

    it('should return 0 resetCount when no stuck events exist', async () => {
      mockPrisma.outboxEvent.findMany.mockResolvedValue([]);

      const result = await service.retryStuckOutboxEvents();

      expect(result.resetCount).toBe(0);
      expect(mockPrisma.outboxEvent.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('recordDlqMessage (AC2)', () => {
    it('should upsert DEAD_LETTER inbox entry and fire alert', async () => {
      const inbox = await service.recordDlqMessage({
        carrierCode: 'GHN',
        eventId: 'evt-dlq-999',
        trackingCode: 'GHN999',
        errorMessage: 'Queue consumer reached max retries',
        payload: { test: true },
      });

      expect(inbox.processedStatus).toBe('DEAD_LETTER');
      expect(mockDlqAlert.notifyDlq).toHaveBeenCalledWith(
        expect.objectContaining({
          carrierCode: 'GHN',
          eventId: 'evt-dlq-999',
          trackingCode: 'GHN999',
        }),
      );
    });
  });
});
