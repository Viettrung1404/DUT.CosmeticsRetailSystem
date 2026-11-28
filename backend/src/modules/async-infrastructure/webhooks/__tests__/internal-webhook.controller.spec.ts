import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InternalWebhookController } from '../internal-webhook.controller';
import { InternalTokenGuard } from '../internal-token.guard';
import { WebhookInboxService } from '../webhook-inbox.service';
import { WebhookProcessorService } from '../webhook-processor.service';

describe('EP09-T03: InternalWebhookController & InternalTokenGuard', () => {
  describe('InternalTokenGuard', () => {
    let guard: InternalTokenGuard;
    let configService: ConfigService;

    beforeEach(() => {
      configService = {
        get: jest.fn((key: string) => {
          if (key === 'INTERNAL_DISPATCH_SECRET') return 'test-internal-secret-123';
          return null;
        }),
      } as any;
      guard = new InternalTokenGuard(configService);
    });

    const createMockContext = (headers: Record<string, string>): ExecutionContext => {
      return {
        switchToHttp: () => ({
          getRequest: () => ({
            headers,
            ip: '127.0.0.1',
          }),
        }),
      } as any;
    };

    it('should throw UnauthorizedException when token header is missing', () => {
      const ctx = createMockContext({});
      expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when token is invalid', () => {
      const ctx = createMockContext({ 'x-internal-token': 'wrong-secret' });
      expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
    });

    it('should pass when valid X-Internal-Token is provided', () => {
      const ctx = createMockContext({ 'x-internal-token': 'test-internal-secret-123' });
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('should pass when valid Bearer Authorization token is provided', () => {
      const ctx = createMockContext({
        authorization: 'Bearer test-internal-secret-123',
      });
      expect(guard.canActivate(ctx)).toBe(true);
    });
  });

  describe('InternalWebhookController Endpoints', () => {
    let controller: InternalWebhookController;
    let mockProcessorService: any;
    let mockInboxService: any;

    beforeEach(async () => {
      mockProcessorService = {
        processWebhook: jest.fn().mockResolvedValue({
          status: 'PROCESSED',
          inboxId: 'inbox-uuid-001',
          shipmentId: 'shipment-uuid-001',
          newStatus: 'DELIVERED',
        }),
      };

      mockInboxService = {
        recordWebhook: jest.fn(),
      };

      const module: TestingModule = await Test.createTestingModule({
        controllers: [InternalWebhookController],
        providers: [
          InternalTokenGuard,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string) => {
                if (key === 'INTERNAL_DISPATCH_SECRET') return 'test-internal-secret-123';
                return null;
              }),
            },
          },
          { provide: WebhookInboxService, useValue: mockInboxService },
          { provide: WebhookProcessorService, useValue: mockProcessorService },
        ],
      }).compile();

      controller = module.get<InternalWebhookController>(InternalWebhookController);
    });

    it('POST /api/v1/internal/webhooks/consume processes message and returns structured result', async () => {
      const requestDto = {
        carrierCode: 'GHN',
        payload: {
          OrderCode: 'GHN123456',
          Status: 'delivered',
        },
        queueMessageId: 'cf-msg-uuid-999',
      };

      const result = await controller.consumeWebhook(requestDto, {
        'x-internal-token': 'test-internal-secret-123',
      });

      expect(result.success).toBe(true);
      expect(result.status).toBe('PROCESSED');
      expect(result.inboxId).toBe('inbox-uuid-001');
      expect(result.shipmentId).toBe('shipment-uuid-001');
      expect(result.newStatus).toBe('DELIVERED');
      expect(mockProcessorService.processWebhook).toHaveBeenCalledWith(
        'GHN',
        requestDto.payload,
        expect.any(Object),
      );
    });

    it('POST /api/v1/internal/queue/dispatch forwards correctly to consumeWebhook', async () => {
      const requestDto = {
        carrierCode: 'AHAMOVE',
        payload: {
          _id: '22VMV123',
          status: 'COMPLETED',
        },
      };

      const result = await controller.dispatchFromQueue(requestDto, {});
      expect(result.success).toBe(true);
      expect(mockProcessorService.processWebhook).toHaveBeenCalledWith(
        'AHAMOVE',
        requestDto.payload,
        expect.any(Object),
      );
    });
  });
});
