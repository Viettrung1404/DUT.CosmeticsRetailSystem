import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { PrismaModule } from '@infrastructure/database/prisma.module';
import { AsyncInfrastructureModule } from '@modules/async-infrastructure';
import {
  IShippingProvider,
  SHIPPING_PROVIDER,
  SHIPPING_PROVIDERS,
} from '../domain/ports/shipping-provider.interface';
import { AhamoveClient } from '../infrastructure/adapters/ahamove/ahamove-client';
import { AhamoveProvider } from '../infrastructure/adapters/ahamove/ahamove-provider';
import { AhamoveRedispatchService } from '../application/services/ahamove-redispatch.service';
import { MockShippingProvider } from '../infrastructure/adapters/mock/mock-shipping.provider';
import { GHNClient } from '../infrastructure/adapters/ghn/ghn-client';
import { GHNProvider } from '../infrastructure/adapters/ghn/ghn.provider';
import { ShipmentOrchestratorService } from '../application/services/shipment-orchestrator.service';
import { QuoteRequestDto } from '../domain/dtos/shipping-provider.dto';
import { cleanupTestEntities } from '../../../core/test/test-cleanup.helper';

jest.setTimeout(60000);

describe('EPIC 07: Ahamove Express 2H Integration - End-to-End Integrated Flow', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let orchestrator: ShipmentOrchestratorService;
  let ahamoveClient: AhamoveClient;
  let ahamoveProvider: AhamoveProvider;
  let redispatchService: AhamoveRedispatchService;
  let originalFetch: typeof global.fetch;

  let testOrderId: string;
  let testFulfillmentOrderId: string;
  let testStoreId: string;
  let testPackageId: string;
  let testShipmentId: string;

  beforeAll(async () => {
    jest.setTimeout(60000);
    originalFetch = global.fetch;

    moduleRef = await Test.createTestingModule({
      imports: [PrismaModule, ConfigModule.forRoot({ isGlobal: true }), AsyncInfrastructureModule],
      providers: [
        AhamoveClient,
        AhamoveProvider,
        AhamoveRedispatchService,
        GHNClient,
        GHNProvider,
        MockShippingProvider,
        {
          provide: SHIPPING_PROVIDERS,
          useFactory: (
            ghn: GHNProvider,
            ahamove: AhamoveProvider,
            mock: MockShippingProvider,
          ) => {
            const map = new Map<string, IShippingProvider>();
            map.set('GHN', ghn);
            map.set('AHAMOVE', ahamove);
            map.set('MOCK', mock);
            return map;
          },
          inject: [GHNProvider, AhamoveProvider, MockShippingProvider],
        },
        {
          provide: SHIPPING_PROVIDER,
          useExisting: AhamoveProvider,
        },
        ShipmentOrchestratorService,
      ],
    }).compile();

    prisma = moduleRef.get<PrismaService>(PrismaService);
    orchestrator = moduleRef.get<ShipmentOrchestratorService>(ShipmentOrchestratorService);
    ahamoveClient = moduleRef.get<AhamoveClient>(AhamoveClient);
    ahamoveProvider = moduleRef.get<AhamoveProvider>(AhamoveProvider);
    redispatchService = moduleRef.get<AhamoveRedispatchService>(AhamoveRedispatchService);

    // Setup Test Data trong DB
    const timestamp = Date.now();

    // 1. Tạo Store tại Quận 1 TP.HCM để test dịch vụ Hỏa tốc 2H Ahamove
    const shortCode = `AHM${Date.now().toString().slice(-6)}`;
    const store = await prisma.store.create({
      data: {
        code: shortCode,
        name: 'GlowUp Showroom Q1 Ahamove',
        address: '123 Lê Duẩn, Bến Nghé, Quận 1',
        district: 'Quận 1',
        city: 'Hồ Chí Minh',
        phone: '02873001234',
        latitude: new Prisma.Decimal(10.7769),
        longitude: new Prisma.Decimal(106.7009),
        isActive: true,
      },
    });
    testStoreId = store.id;

    // 2. Lấy Customer và Variant có sẵn
    const customer = await prisma.customer.findFirst({ select: { id: true } });
    const variant = await prisma.productVariant.findFirst({ select: { id: true } });

    // 3. Tạo Order Hỏa tốc 2H
    const order = await prisma.order.create({
      data: {
        orderNumber: `ORD-AHM-${timestamp}`,
        customerId: customer?.id || null,
        storeId: store.id,
        orderType: 'ONLINE',
        status: 'PROCESSING',
        subtotal: new Prisma.Decimal(350000),
        totalAmount: new Prisma.Decimal(385000),
        shippingAddress: {
          fullName: 'Lê Hoàng Long',
          phone: '0908123456',
          street: '456 Hai Bà Trưng, Phường Tân Định',
          district: 'Quận 1',
          city: 'Hồ Chí Minh',
          latitude: 10.7891,
          longitude: 106.6912,
        },
      },
    });
    testOrderId = order.id;

    // 4. FulfillmentOrder
    const fo = await prisma.fulfillmentOrder.create({
      data: {
        orderId: order.id,
        fulfillmentOrderNumber: `FO-AHM-${timestamp}`,
        sourceLocationId: store.id,
        status: 'PACKED',
        shippingServiceCode: 'EXPRESS_2H',
        totalItemsCount: 1,
      },
    });
    testFulfillmentOrderId = fo.id;

    // 5. Package thực tế (từ quy trình packing ở EP04)
    const pkg = await prisma.package.create({
      data: {
        packageCode: `PKG-AHM-${timestamp}`,
        fulfillmentOrderId: fo.id,
        actualWeightGrams: 250,
        lengthCm: 12,
        widthCm: 10,
        heightCm: 6,
        items: variant
          ? {
              create: {
                productVariantId: variant.id,
                quantity: 1,
              },
            }
          : undefined,
      },
    });
    testPackageId = pkg.id;

    // 6. Shipment (Outbound gán AHAMOVE carrierCode)
    const shipment = await prisma.shipment.create({
      data: {
        shipmentCode: `SHIP-AHM-${timestamp}`,
        orderId: order.id,
        fulfillmentOrderId: fo.id,
        shipmentType: 'OUTBOUND',
        carrierCode: 'AHAMOVE',
        carrierServiceCode: 'AHAMOVE_EXPRESS_2H',
        status: 'PENDING_CREATION',
        codAmount: new Prisma.Decimal(0),
        packages: {
          create: {
            packageId: pkg.id,
          },
        },
      },
    });
    testShipmentId = shipment.id;
  });

  afterAll(async () => {
    global.fetch = originalFetch;

    try {
      await cleanupTestEntities(prisma, {
        storeIds: [testStoreId].filter(Boolean),
        orderIds: [testOrderId].filter(Boolean),
        shipmentIds: [testShipmentId].filter(Boolean),
      });
    } catch {
      // Ignore cleanup error in test
    }
    await prisma.$disconnect();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('STAGE 1: Báo giá cước Hỏa tốc 2H & Chặn đơn vượt bán kính 10km (DEC-01)', async () => {
    // 1.1 Mock Ahamove Estimated Fee Success
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes('/v1/order/estimated_fee')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            total_price: 35000,
            service_id: 'SGN-BIKE',
            distance: 2.8,
            duration: 18,
          }),
        });
      }
      return Promise.reject(new Error('Unknown url'));
    });

    const quoteReq: QuoteRequestDto = {
      carrierCode: 'AHAMOVE',
      senderAddress: {
        addressLine: 'Showroom Q1: 123 Lê Duẩn',
        province: 'Hồ Chí Minh',
        district: 'Quận 1',
        latitude: 10.7769,
        longitude: 106.7009,
      },
      recipientAddress: {
        addressLine: '456 Hai Bà Trưng',
        province: 'Hồ Chí Minh',
        district: 'Quận 1',
        latitude: 10.7891,
        longitude: 106.6912,
      },
      parcel: {
        weightGrams: 250,
        lengthCm: 12,
        widthCm: 10,
        heightCm: 6,
      },
    };

    const quoteSuccess = await ahamoveClient.calculateFee(quoteReq);
    expect(quoteSuccess.feeAmountVnd).toBe(35000);
    expect(quoteSuccess.serviceCode).toBe('AHAMOVE_EXPRESS_2H');
    expect(quoteSuccess.estimatedDeliveryDays).toBe(0); // Giao tức thời trong 2h

    // 1.2 Kiểm tra vi phạm bán kính 10km (DEC-01) -> Bị từ chối
    const farReq: QuoteRequestDto = {
      ...quoteReq,
      recipientAddress: {
        addressLine: 'Củ Chi',
        province: 'Hồ Chí Minh',
        district: 'Củ Chi',
        latitude: 11.0067,
        longitude: 106.5134, // ~33km
      },
    };

    await expect(ahamoveClient.calculateFee(farReq)).rejects.toThrow(
      /vượt quá giới hạn phục vụ tối đa 10 km/,
    );
  }, 30000);

  it('STAGE 2: Dispatch Shipment qua Ahamove Provider - Sinh mã 22VMV và Live Tracking Map link', async () => {
    // Mock Ahamove Order Create & Shared Link
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes('/v1/order/create')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            order_id: '22VMV-E2E-999',
            status: 'ASSIGNING',
            total_price: 35000,
            shared_link: 'https://ahamove.com/share/22VMV-E2E-999',
          }),
        });
      }
      return Promise.reject(new Error(`Unexpected fetch to ${url}`));
    });

    const dispatchResult = await orchestrator.dispatchShipment(testShipmentId);

    // Kiểm tra kết quả dispatch
    expect(dispatchResult.success).toBe(true);
    expect(dispatchResult.status).toBe('CREATED');
    expect(dispatchResult.trackingCode).toBe('22VMV-E2E-999');
    expect(dispatchResult.trackingUrl).toBe('https://ahamove.com/share/22VMV-E2E-999');

    // Kiểm tra bản ghi trong DB
    const updatedShipment = await prisma.shipment.findUnique({
      where: { id: testShipmentId },
    });
    expect(updatedShipment?.status).toBe('CREATED');
    expect(updatedShipment?.trackingCode).toBe('22VMV-E2E-999');
    expect(updatedShipment?.trackingUrl).toBe('https://ahamove.com/share/22VMV-E2E-999');

    // Kiểm tra Outbox Event SHIPMENT_CREATED
    const outboxEvent = await prisma.outboxEvent.findFirst({
      where: {
        aggregateType: 'SHIPMENT',
        aggregateId: testShipmentId,
        eventType: 'SHIPMENT_CREATED',
      },
    });
    expect(outboxEvent).toBeDefined();
    expect((outboxEvent?.payload as any)?.trackingCode).toBe('22VMV-E2E-999');
  }, 30000);

  it('STAGE 3: Nhận Webhook Ahamove & Xử lý Trạng Thái Bất Thường', () => {
    // 3.1 Webhook shipper đang đi giao
    const deliveringPayload = {
      _id: '22VMV-E2E-999',
      status: 'IN_PROCESS',
      dropoff_status: 'DELIVERING',
      timestamp: '2026-11-16T15:30:00Z',
    };
    const parsedDelivering = ahamoveProvider.parseWebhook(deliveringPayload, {});
    expect(parsedDelivering.status).toBe('OUT_FOR_DELIVERY');
    expect(parsedDelivering.trackingCode).toBe('22VMV-E2E-999');

    // 3.2 Webhook giao thành công
    const completedPayload = {
      _id: '22VMV-E2E-999',
      status: 'COMPLETED',
      dropoff_status: 'SUCCESS',
    };
    const parsedCompleted = ahamoveProvider.parseWebhook(completedPayload, {});
    expect(parsedCompleted.status).toBe('DELIVERED');

    // 3.3 [CRITICAL CORRECTION]: Mã trạng thái lạ => Bắt buộc chuyển về EXCEPTION
    const weirdPayload = {
      _id: '22VMV-E2E-999',
      status: 'vehicle_seized_by_traffic_police',
    };
    const parsedWeird = ahamoveProvider.parseWebhook(weirdPayload, {});
    expect(parsedWeird.status).toBe('EXCEPTION');
    expect(parsedWeird.status).not.toBe('IN_TRANSIT');
  });

  it('STAGE 4: Xử lý Tự Động Re-dispatch Khi Tài Xế Hủy Chuyến (Tối Đa 2 Lần)', async () => {
    // Mock Ahamove tạo cuốc xe mới khi re-dispatch
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes('/v1/order/create')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            order_id: '22VMV-RELOAD-NEW',
            status: 'ASSIGNING',
            total_price: 35000,
            shared_link: 'https://ahamove.com/share/22VMV-RELOAD-NEW',
          }),
        });
      }
      return Promise.reject(new Error(`Unexpected fetch to ${url}`));
    });

    // 4.1 Lần hủy thứ 1: Tự động tìm tài xế mới thành công (Re-dispatch 1/2)
    const redispatchRes1 = await redispatchService.handleDriverCancellation(
      '22VMV-E2E-999',
      'Tài xế bị thủng lốp',
    );
    expect(redispatchRes1.success).toBe(true);
    expect(redispatchRes1.reallocated).toBe(true);
    expect(redispatchRes1.attemptCount).toBe(1);
    expect(redispatchRes1.newTrackingCode).toBe('22VMV-RELOAD-NEW');

    // Kiểm tra Outbox Event AHAMOVE_DRIVER_REASSIGNED
    const outboxReassign = await prisma.outboxEvent.findFirst({
      where: {
        aggregateId: testShipmentId,
        eventType: 'AHAMOVE_DRIVER_REASSIGNED',
      },
    });
    expect(outboxReassign).toBeDefined();

    // 4.2 Lần hủy thứ 2: Vẫn tiếp tục re-dispatch thành công (Re-dispatch 2/2)
    const redispatchRes2 = await redispatchService.handleDriverCancellation(
      '22VMV-RELOAD-NEW',
      'Tài xế thứ 2 bận việc',
    );
    expect(redispatchRes2.success).toBe(true);
    expect(redispatchRes2.attemptCount).toBe(2);

    // 4.3 Lần hủy thứ 3 (Vượt quá 2 lần): Chuyển sang DISPATCH_FAILED & Bắn cảnh báo can thiệp thủ công
    const redispatchRes3 = await redispatchService.handleDriverCancellation(
      '22VMV-RELOAD-NEW',
      'Tài xế thứ 3 từ chối',
    );
    expect(redispatchRes3.success).toBe(false);
    expect(redispatchRes3.reallocated).toBe(false);
    expect(redispatchRes3.status).toBe('DISPATCH_FAILED');
    expect(redispatchRes3.message).toContain('Cần can thiệp thủ công');

    // Kiểm tra DB status là DISPATCH_FAILED
    const failedShipment = await prisma.shipment.findUnique({
      where: { id: testShipmentId },
    });
    expect(failedShipment?.status).toBe('DISPATCH_FAILED');

    // Kiểm tra Outbox Event AHAMOVE_MANUAL_INTERVENTION_REQUIRED
    const outboxManual = await prisma.outboxEvent.findFirst({
      where: {
        aggregateId: testShipmentId,
        eventType: 'AHAMOVE_MANUAL_INTERVENTION_REQUIRED',
      },
    });
    expect(outboxManual).toBeDefined();
  }, 30000);
});
