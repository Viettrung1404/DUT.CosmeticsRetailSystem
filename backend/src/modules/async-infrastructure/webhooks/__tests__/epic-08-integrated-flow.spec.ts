import { Test, TestingModule } from '@nestjs/testing';
import { WebhookInboxService } from '../webhook-inbox.service';
import { WebhookProcessorService } from '../webhook-processor.service';
import { ShipmentAttemptService } from '@modules/shipping/application/services/shipment-attempt.service';
import { ReturnToOriginService } from '@modules/shipping/application/services/return-to-origin.service';
import { RtoPackageCondition } from '@modules/shipping/presentation/dtos/return-to-origin.dto';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { OrderStateAggregator } from '@modules/oms/application/services/order-state-aggregator';
import { OUTBOX_WRITER } from '../../outbox/outbox-writer.interface';
import { Prisma } from '@prisma/client';

describe('EPIC 08: Webhook Inbox & Tracking Orchestration - End-to-End Integrated Flow', () => {
  let webhookInboxService: WebhookInboxService;
  let webhookProcessorService: WebhookProcessorService;
  let shipmentAttemptService: ShipmentAttemptService;
  let returnToOriginService: ReturnToOriginService;
  let orderStateAggregator: OrderStateAggregator;

  // In-memory data structures
  const inboxMap = new Map<string, any>();
  const shipmentMap = new Map<string, any>();
  const orderMap = new Map<string, any>();
  const lotMap = new Map<string, any>();
  const balanceMap = new Map<string, any>();
  const attemptsList: any[] = [];
  const eventsList: any[] = [];
  const outboxList: any[] = [];

  beforeEach(async () => {
    inboxMap.clear();
    shipmentMap.clear();
    orderMap.clear();
    lotMap.clear();
    balanceMap.clear();
    attemptsList.length = 0;
    eventsList.length = 0;
    outboxList.length = 0;

    const mockPrisma = {
      shippingWebhookInbox: {
        create: jest.fn().mockImplementation(async ({ data }) => {
          const key = `${data.carrierCode}:${data.eventId}`;
          if (inboxMap.has(key)) {
            throw new Prisma.PrismaClientKnownRequestError('Duplicate key', {
              code: 'P2002',
              clientVersion: '6.19.3',
              meta: { target: ['carrier_code', 'event_id'] },
            });
          }
          const item = {
            id: `inbox-${Date.now()}-${Math.random()}`,
            carrierCode: data.carrierCode,
            eventId: data.eventId,
            eventType: data.eventType || 'SHIPMENT_STATUS_UPDATE',
            trackingCode: data.trackingCode,
            payload: data.payload,
            processedStatus: data.processedStatus || 'PENDING',
            errorMessage: null,
            receivedAt: new Date(),
            processedAt: null,
          };
          inboxMap.set(key, item);
          inboxMap.set(item.id, item);
          return item;
        }),
        findUnique: jest.fn().mockImplementation(async ({ where }) => {
          if (where.id) return inboxMap.get(where.id) || null;
          if (where.carrierCode_eventId) {
            const { carrierCode, eventId } = where.carrierCode_eventId;
            return inboxMap.get(`${carrierCode}:${eventId}`) || null;
          }
          return null;
        }),
        update: jest.fn().mockImplementation(async ({ where, data }) => {
          const item = inboxMap.get(where.id);
          if (item) {
            const updated = { ...item, ...data };
            inboxMap.set(where.id, updated);
            return updated;
          }
          return null;
        }),
      },
      shipment: {
        findFirst: jest.fn().mockImplementation(async ({ where }) => {
          for (const s of shipmentMap.values()) {
            if (
              where.OR?.some(
                (c: any) =>
                  (c.id && c.id === s.id) ||
                  (c.trackingCode && c.trackingCode === s.trackingCode) ||
                  (c.shipmentCode && c.shipmentCode === s.shipmentCode),
              )
            ) {
              return s;
            }
          }
          return null;
        }),
        update: jest.fn().mockImplementation(async ({ where, data }) => {
          const s = shipmentMap.get(where.id);
          if (s) {
            const updated = {
              ...s,
              ...data,
              failedAttempts:
                data.failedAttempts?.increment !== undefined
                  ? (s.failedAttempts || 0) + data.failedAttempts.increment
                  : (data.failedAttempts ?? s.failedAttempts),
            };
            shipmentMap.set(where.id, updated);
            return updated;
          }
          return null;
        }),
      },
      shipmentAttempt: {
        create: jest.fn().mockImplementation(async ({ data }) => {
          const attempt = { id: `att-${Date.now()}-${Math.random()}`, ...data };
          attemptsList.push(attempt);
          return attempt;
        }),
        findMany: jest.fn().mockImplementation(async ({ where }) => {
          return attemptsList.filter((a) => a.shipmentId === where.shipmentId);
        }),
      },
      shipmentEvent: {
        create: jest.fn().mockImplementation(async ({ data }) => {
          eventsList.push(data);
          return { id: `evt-${Date.now()}`, ...data };
        }),
      },
      inventoryLot: {
        update: jest.fn().mockImplementation(async ({ where, data }) => {
          const lot = lotMap.get(where.id);
          if (lot) {
            lot.quantityOnHand += data.quantityOnHand.increment || 0;
            return lot;
          }
          return null;
        }),
      },
      inventory: {
        update: jest.fn().mockImplementation(async ({ where, data }) => {
          const key = `${where.storeId_productVariantId.storeId}:${where.storeId_productVariantId.productVariantId}`;
          const bal = balanceMap.get(key);
          if (bal) {
            if (data.quantity?.increment) {
              bal.quantity += data.quantity.increment;
            }
            if (data.quarantinedQuantity?.increment) {
              bal.quarantinedQuantity += data.quarantinedQuantity.increment;
            }
            return bal;
          }
          return null;
        }),
      },
      fulfillmentOrder: {
        update: jest.fn().mockImplementation(async ({ where, data }) => {
          return { id: where.id, ...data };
        }),
      },
      $transaction: jest.fn().mockImplementation(async (callback) => {
        return callback(mockPrisma);
      }),
    };

    const mockAggregator = {
      computeOrderStatus: jest.fn().mockImplementation(async (orderId) => {
        const o = orderMap.get(orderId);
        return { orderId, newStatus: o?.status || 'SHIPPED', hasChanged: false };
      }),
    };

    const mockWriter = {
      record: jest.fn().mockImplementation(async (client, event) => {
        outboxList.push(event);
        return { id: `outbox-${Date.now()}`, ...event };
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookInboxService,
        WebhookProcessorService,
        ShipmentAttemptService,
        ReturnToOriginService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: OrderStateAggregator, useValue: mockAggregator },
        { provide: OUTBOX_WRITER, useValue: mockWriter },
      ],
    }).compile();

    webhookInboxService = module.get<WebhookInboxService>(WebhookInboxService);
    webhookProcessorService = module.get<WebhookProcessorService>(WebhookProcessorService);
    shipmentAttemptService = module.get<ShipmentAttemptService>(ShipmentAttemptService);
    returnToOriginService = module.get<ReturnToOriginService>(ReturnToOriginService);
    orderStateAggregator = module.get<OrderStateAggregator>(OrderStateAggregator);
  });

  it('STAGE 1: Webhook Ingress & Deduplication (EP08-T01) - Chống trùng lặp & Fingerprint', async () => {
    const payload = {
      OrderCode: 'GHN-E2E-001',
      Status: 'picking',
      Time: '2026-11-16T10:00:00Z',
    };

    // Gửi 10 lần đồng thời
    const promises = Array.from({ length: 10 }, () =>
      webhookInboxService.recordWebhook('GHN', payload),
    );
    const results = await Promise.all(promises);

    const recorded = results.filter((r) => r.status === 'RECORDED');
    const duplicates = results.filter((r) => r.status === 'ALREADY_PROCESSED');

    expect(recorded.length).toBe(1);
    expect(duplicates.length).toBe(9);
    // Fingerprint SHA256 hex length = 64
    expect(recorded[0].inbox.eventId.length).toBe(64);
  });

  it('STAGE 2: Webhook Processing Pipeline (EP08-T02) - Chuỗi trạng thái & State Transition Guard', async () => {
    const orderId = 'order-e2e-001';
    const shipmentId = 'shipment-e2e-001';
    const trackingCode = 'LAD-E2E-999';

    orderMap.set(orderId, { id: orderId, status: 'SHIPPED' });
    shipmentMap.set(shipmentId, {
      id: shipmentId,
      orderId,
      shipmentCode: 'SHIP-E2E-999',
      trackingCode,
      status: 'DRIVER_ASSIGNED',
      codStatus: 'COD_EXPECTED',
      deliveredAt: null,
      failedAttempts: 0,
    });

    // 1. Webhook IN_TRANSIT
    const step1 = await webhookProcessorService.processWebhook('GHN', {
      OrderCode: trackingCode,
      Status: 'storing', // storing -> IN_TRANSIT
      EventId: 'EVT-E2E-01',
    });
    expect(step1.status).toBe('PROCESSED');
    expect(step1.newStatus).toBe('IN_TRANSIT');
    expect(shipmentMap.get(shipmentId).status).toBe('IN_TRANSIT');

    // 2. Webhook OUT_FOR_DELIVERY
    const step2 = await webhookProcessorService.processWebhook('GHN', {
      OrderCode: trackingCode,
      Status: 'delivering', // delivering -> OUT_FOR_DELIVERY
      EventId: 'EVT-E2E-02',
    });
    expect(step2.status).toBe('PROCESSED');
    expect(step2.newStatus).toBe('OUT_FOR_DELIVERY');

    // 3. Webhook DELIVERED
    const step3 = await webhookProcessorService.processWebhook('GHN', {
      OrderCode: trackingCode,
      Status: 'delivered', // delivered -> DELIVERED
      EventId: 'EVT-E2E-03',
      Time: '2026-11-16T15:00:00Z',
    });
    expect(step3.status).toBe('PROCESSED');
    expect(step3.newStatus).toBe('DELIVERED');

    const deliveredShipment = shipmentMap.get(shipmentId);
    expect(deliveredShipment.status).toBe('DELIVERED');
    expect(deliveredShipment.deliveredAt).toBeDefined();
    expect(deliveredShipment.codStatus).toBe('COD_COLLECTED');

    // 4. Webhook gửi trễ IN_TRANSIT sau khi đã DELIVERED -> Phải bị IGNORED
    const step4 = await webhookProcessorService.processWebhook('GHN', {
      OrderCode: trackingCode,
      Status: 'transporting', // transporting -> IN_TRANSIT
      EventId: 'EVT-E2E-04-LATE',
    });
    expect(step4.status).toBe('IGNORED');
    expect(step4.reason).toContain('Cannot transition from terminal status DELIVERED');
    expect(shipmentMap.get(shipmentId).status).toBe('DELIVERED');
  });

  it('STAGE 3: Delivery Attempts Tracking (EP08-T03) - Thất bại 1, 2 không hủy đơn, lần 3 sang RETURNING', async () => {
    const orderId = 'order-e2e-fail';
    const shipmentId = 'shipment-e2e-fail';
    const trackingCode = 'LAD-E2E-FAIL';

    orderMap.set(orderId, { id: orderId, status: 'SHIPPED' });
    shipmentMap.set(shipmentId, {
      id: shipmentId,
      orderId,
      trackingCode,
      status: 'OUT_FOR_DELIVERY',
      failedAttempts: 0,
    });

    // Lần 1: Khách không nghe máy
    const att1 = await shipmentAttemptService.recordFailedAttempt(shipmentId, {
      failureReasonCode: 'CUSTOMER_UNREACHABLE',
    });
    expect(att1.attemptNumber).toBe(1);
    expect(att1.status).toBe('DELIVERY_FAILED');
    expect(att1.isRtoSuggested).toBe(false);

    // Lần 2: Khách hẹn ngày khác
    const att2 = await shipmentAttemptService.recordFailedAttempt(shipmentId, {
      failureReasonCode: 'RESCHEDULED',
    });
    expect(att2.attemptNumber).toBe(2);
    expect(att2.status).toBe('DELIVERY_FAILED');
    expect(att2.isRtoSuggested).toBe(false);

    // Lần 3: Khách từ chối nhận -> Tự động chuyển RETURNING
    const att3 = await shipmentAttemptService.recordFailedAttempt(shipmentId, {
      failureReasonCode: 'CUSTOMER_REFUSED',
    });
    expect(att3.attemptNumber).toBe(3);
    expect(att3.status).toBe('RETURNING');
    expect(att3.isRtoSuggested).toBe(true);

    expect(shipmentMap.get(shipmentId).status).toBe('RETURNING');
  });

  it('STAGE 4: Return to Origin (RTO) Workflow (EP08-T03) - Tiếp nhận kiện hoàn & Khôi phục lô FEFO', async () => {
    const locationId = 'store-hcm-uuid';
    const variantId = 'variant-cream-uuid';
    const lotId = 'lot-fefo-2027';

    lotMap.set(lotId, { id: lotId, quantityOnHand: 50 });
    balanceMap.set(`${locationId}:${variantId}`, {
      storeId: locationId,
      productVariantId: variantId,
      quantity: 50,
      quarantinedQuantity: 0,
    });

    const shipmentId = 'shipment-rto-e2e';
    const orderId = 'order-rto-e2e';
    orderMap.set(orderId, { id: orderId, status: 'SHIPPED' });

    shipmentMap.set(shipmentId, {
      id: shipmentId,
      orderId,
      trackingCode: 'LAD-RTO-SUCCESS',
      shipmentCode: 'SHIP-RTO-SUCCESS',
      status: 'RETURNING',
      fulfillmentOrderId: 'fo-rto-e2e',
      fulfillmentOrder: {
        id: 'fo-rto-e2e',
        sourceLocationId: locationId,
        reservation: {
          items: [{ lotId, productVariantId: variantId, quantity: 5 }],
        },
      },
    });

    // Quét mã nhận hàng hoàn nguyên seal (INTACT)
    const rtoResult = await returnToOriginService.receiveRtoShipment(shipmentId, {
      packageCondition: RtoPackageCondition.INTACT,
      notes: 'Bưu phẩm hoàn trả nguyên hộp, tem nguyên vẹn',
      receivedById: 'qc-staff-99',
    });

    expect(rtoResult.success).toBe(true);
    expect(rtoResult.status).toBe('RETURNED');
    expect(rtoResult.packageCondition).toBe(RtoPackageCondition.INTACT);
    expect(rtoResult.restockedLots.length).toBe(1);

    // Tồn kho lô được khôi phục chính xác (+5)
    expect(lotMap.get(lotId).quantityOnHand).toBe(55);
    expect(balanceMap.get(`${locationId}:${variantId}`).quantity).toBe(55);
    expect(balanceMap.get(`${locationId}:${variantId}`).quarantinedQuantity).toBe(0);

    // Vận đơn chuyển sang RETURNED
    expect(shipmentMap.get(shipmentId).status).toBe('RETURNED');

    // Outbox phát sự kiện SHIPMENT_RETURNED_TO_ORIGIN
    const rtoEvent = outboxList.find((e) => e.eventType === 'SHIPMENT_RETURNED_TO_ORIGIN');
    expect(rtoEvent).toBeDefined();
    expect(rtoEvent.payload.packageCondition).toBe('INTACT');
    expect(rtoEvent.payload.restockedLots[0].quantity).toBe(5);
  });
});
