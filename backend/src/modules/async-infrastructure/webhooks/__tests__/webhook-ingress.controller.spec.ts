import { Test, TestingModule } from '@nestjs/testing';
import { WebhookIngressController } from '../webhook-ingress.controller';
import { WebhookInboxService } from '../webhook-inbox.service';

describe('EP08-T01: WebhookIngressController', () => {
  let controller: WebhookIngressController;
  let inboxService: WebhookInboxService;

  const mockWebhookInboxService = {
    recordWebhook: jest.fn().mockImplementation(async (carrierCode, payload) => {
      const isDuplicate = payload.isDuplicate === true;
      return {
        isDuplicate,
        status: isDuplicate ? 'ALREADY_PROCESSED' : 'RECORDED',
        inbox: {
          id: 'inbox-id-123',
          carrierCode,
          eventId: payload.eventId || 'EVT-MOCK-123',
          processedStatus: 'PENDING',
        },
      };
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WebhookIngressController],
      providers: [
        {
          provide: WebhookInboxService,
          useValue: mockWebhookInboxService,
        },
      ],
    }).compile();

    controller = module.get<WebhookIngressController>(WebhookIngressController);
    inboxService = module.get<WebhookInboxService>(WebhookInboxService);
  });

  it('POST /api/v1/webhooks/ghn tiếp nhận webhook GHN chuẩn', async () => {
    const payload = { OrderCode: 'LAD-123', Status: 'delivered' };
    const res = await controller.receiveGhnWebhook(payload, {});

    expect(res.success).toBe(true);
    expect(res.status).toBe('RECORDED');
    expect(res.isDuplicate).toBe(false);
    expect(inboxService.recordWebhook).toHaveBeenCalledWith('GHN', payload, {});
  });

  it('POST /api/v1/webhooks/ahamove tiếp nhận webhook Ahamove chuẩn', async () => {
    const payload = { _id: '22VMV-123', status: 'COMPLETED' };
    const res = await controller.receiveAhamoveWebhook(payload, {});

    expect(res.success).toBe(true);
    expect(res.status).toBe('RECORDED');
    expect(inboxService.recordWebhook).toHaveBeenCalledWith('AHAMOVE', payload, {});
  });

  it('POST /api/v1/webhooks/shipping/:carrierCode tiếp nhận đa hình', async () => {
    const payload = { trackingCode: 'MOCK-123', status: 'IN_TRANSIT' };
    const res = await controller.receiveGenericCarrierWebhook('mock', payload, {});

    expect(res.success).toBe(true);
    expect(inboxService.recordWebhook).toHaveBeenCalledWith('MOCK', payload, {});
  });
});
