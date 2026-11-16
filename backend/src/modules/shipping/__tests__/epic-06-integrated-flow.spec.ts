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
import { GHNClient, GHN_FALLBACK_RATES } from '../infrastructure/adapters/ghn/ghn-client';
import { GHNProvider } from '../infrastructure/adapters/ghn/ghn.provider';
import { MockShippingProvider } from '../infrastructure/adapters/mock/mock-shipping.provider';
import { ShipmentOrchestratorService } from '../application/services/shipment-orchestrator.service';
import { QuoteRequestDto } from '../domain/dtos/shipping-provider.dto';

describe('EPIC 06: GHN Standard Integration - End-to-End Integrated Flow', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let orchestrator: ShipmentOrchestratorService;
  let ghnClient: GHNClient;
  let ghnProvider: GHNProvider;
  let originalFetch: typeof global.fetch;

  let testOrderId: string;
  let testFulfillmentOrderId: string;
  let testCreatedStoreId: string | null = null;
  let testPackageId: string;
  let testShipmentId: string;

  beforeAll(async () => {
    jest.setTimeout(60000);
    originalFetch = global.fetch;

    moduleRef = await Test.createTestingModule({
      imports: [PrismaModule, ConfigModule.forRoot({ isGlobal: true }), AsyncInfrastructureModule],
      providers: [
        GHNClient,
        GHNProvider,
        MockShippingProvider,
        {
          provide: SHIPPING_PROVIDERS,
          useFactory: (ghn: GHNProvider, mock: MockShippingProvider) => {
            const map = new Map<string, IShippingProvider>();
            map.set('GHN', ghn);
            map.set('MOCK', mock);
            return map;
          },
          inject: [GHNProvider, MockShippingProvider],
        },
        {
          provide: SHIPPING_PROVIDER,
          useExisting: GHNProvider,
        },
        ShipmentOrchestratorService,
      ],
    }).compile();

    prisma = moduleRef.get<PrismaService>(PrismaService);
    orchestrator = moduleRef.get<ShipmentOrchestratorService>(ShipmentOrchestratorService);
    ghnClient = moduleRef.get<GHNClient>(GHNClient);
    ghnProvider = moduleRef.get<GHNProvider>(GHNProvider);

    // Setup Test Data trong DB
    const timestamp = Date.now();

    const shortCode = `ST${Date.now().toString().slice(-6)}`;

    // 1. Lấy Store có sẵn hoặc tạo Store ngắn
    let store = await prisma.store.findFirst({ where: { isActive: true } });
    if (!store) {
      store = await prisma.store.create({
        data: {
          code: shortCode,
          name: 'GlowUp Central Hub Da Nang',
          address: '155 Nguyen Van Linh, Vinh Trung',
          district: '1530',
          city: 'Da Nang',
          phone: '0905123456',
          isActive: true,
        },
      });
      testCreatedStoreId = store.id;
    }

    // 2. Lấy Customer và Variant có sẵn
    const customer = await prisma.customer.findFirst({ select: { id: true } });
    const variant = await prisma.productVariant.findFirst({ select: { id: true, price: true } });

    // 3. Tạo Order
    const order = await prisma.order.create({
      data: {
        orderNumber: `ORD-GHN-${timestamp}`,
        customerId: customer?.id || null,
        storeId: store.id,
        orderType: 'ONLINE',
        status: 'PROCESSING',
        subtotal: new Prisma.Decimal(450000),
        totalAmount: new Prisma.Decimal(450000),
        shippingAddress: {
          fullName: 'Tran Thi Mai',
          phone: '0912987654',
          street: '12 Bach Dang',
          ward: '340101',
          district: '1530',
          city: 'Da Nang',
        },
      },
    });
    testOrderId = order.id;

    // 4. FulfillmentOrder
    const fo = await prisma.fulfillmentOrder.create({
      data: {
        orderId: order.id,
        fulfillmentOrderNumber: `FO-GHN-${timestamp}`,
        sourceLocationId: store.id,
        status: 'PACKED',
        shippingServiceCode: 'STANDARD',
        totalItemsCount: 1,
      },
    });
    testFulfillmentOrderId = fo.id;

    // 5. Package thực tế (từ quy trình packing ở EP04)
    const pkg = await prisma.package.create({
      data: {
        packageCode: `PKG-GHN-${timestamp}`,
        fulfillmentOrderId: fo.id,
        actualWeightGrams: 380,
        lengthCm: 15,
        widthCm: 12,
        heightCm: 8,
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

    // 6. Shipment (Outbound gán GHN carrierCode)
    const shipment = await prisma.shipment.create({
      data: {
        shipmentCode: `SHIP-GHN-${timestamp}`,
        orderId: order.id,
        fulfillmentOrderId: fo.id,
        shipmentType: 'OUTBOUND',
        carrierCode: 'GHN',
        carrierServiceCode: 'GHN_STANDARD',
        status: 'PENDING_CREATION',
        codAmount: new Prisma.Decimal(450000),
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
      if (testShipmentId) {
        await prisma.outboxEvent.deleteMany({
          where: { aggregateId: testShipmentId },
        });
        await prisma.shipmentPackage.deleteMany({ where: { shipmentId: testShipmentId } });
        await prisma.shipment.delete({ where: { id: testShipmentId } });
      }
      if (testPackageId) {
        await prisma.packageItem.deleteMany({ where: { packageId: testPackageId } });
        await prisma.package.delete({ where: { id: testPackageId } });
      }
      if (testFulfillmentOrderId) {
        await prisma.fulfillmentOrder.delete({ where: { id: testFulfillmentOrderId } });
      }
      if (testOrderId) {
        await prisma.order.delete({ where: { id: testOrderId } });
      }
      if (testCreatedStoreId) {
        await prisma.store.delete({ where: { id: testCreatedStoreId } });
      }
    } catch {
      // Ignore cleanup error in test
    }
    await prisma.$disconnect();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('STAGE 1: GHN Client báo giá cước vận chuyển chuẩn xác & Fallback khi Timeout', async () => {
    // 1.1 Mock GHN Fee Calculation Success
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes('/shipping-order/fee')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            code: 200,
            message: 'Success',
            data: { total: 27500, service_fee: 25000, insurance_fee: 2500 },
          }),
        });
      }
      return Promise.reject(new Error('Unknown url'));
    });

    const quoteReq: QuoteRequestDto = {
      carrierCode: 'GHN',
      senderAddress: {
        addressLine: 'Central Hub',
        province: 'Đà Nẵng',
        district: '1530',
      },
      recipientAddress: {
        addressLine: '456 Bạch Đằng',
        province: 'Đà Nẵng',
        district: '1530',
        ward: '340101',
      },
      parcel: {
        weightGrams: 380,
        lengthCm: 15,
        widthCm: 12,
        heightCm: 8,
      },
      insuranceValueVnd: 450000,
    };

    const quoteSuccess = await ghnClient.calculateFee(quoteReq);
    expect(quoteSuccess.feeAmountVnd).toBe(27500);
    expect(quoteSuccess.serviceCode).toBe('GHN_STANDARD');

    // 1.2 Mock GHN Timeout -> Fallback static pricing (AC2)
    const timeoutError = new Error('Timeout 5s');
    timeoutError.name = 'TimeoutError';
    global.fetch = jest.fn().mockRejectedValue(timeoutError);

    const quoteFallback = await ghnClient.calculateFee(quoteReq);
    expect(quoteFallback.feeAmountVnd).toBe(GHN_FALLBACK_RATES.SAME_PROVINCE_VND); // 22.000 VND
    expect(quoteFallback.carrierCode).toBe('GHN');
  });

  it('STAGE 2: Dispatch Shipment qua GHN Provider - Sinh mã LADXXXXX và tem nhãn nhiệt A6', async () => {
    // Mock GHN Order Create & A6 Gen Token
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes('/shipping-order/create')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            code: 200,
            message: 'Success',
            data: {
              order_code: 'LAD-TEST-E2E-789',
              total_fee: 29000,
              expected_delivery_time: '2026-11-20T10:00:00Z',
            },
          }),
        });
      }
      if (url.includes('/a5/gen-token')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            code: 200,
            message: 'Success',
            data: {
              token: 'SECURE_PRINT_A6_TOKEN_12345',
            },
          }),
        });
      }
      return Promise.reject(new Error(`Unexpected fetch to ${url}`));
    });

    const dispatchResult = await orchestrator.dispatchShipment(testShipmentId);

    // Kiểm tra kết quả dispatch
    expect(dispatchResult.success).toBe(true);
    expect(dispatchResult.status).toBe('CREATED');
    expect(dispatchResult.trackingCode).toBe('LAD-TEST-E2E-789');
    expect(dispatchResult.shippingLabelUrl).toBe(
      'https://online-gateway.ghn.vn/a5/public-api/printA5?token=SECURE_PRINT_A6_TOKEN_12345',
    );

    // Kiểm tra bản ghi trong cơ sở dữ liệu
    const updatedShipment = await prisma.shipment.findUnique({
      where: { id: testShipmentId },
    });
    expect(updatedShipment?.status).toBe('CREATED');
    expect(updatedShipment?.trackingCode).toBe('LAD-TEST-E2E-789');
    expect(updatedShipment?.shippingLabelUrl).toContain('token=SECURE_PRINT_A6_TOKEN_12345');
    expect(Number(updatedShipment?.actualShippingFee)).toBe(29000);

    // Kiểm tra Outbox Event đã được ghi
    const outboxEvent = await prisma.outboxEvent.findFirst({
      where: {
        aggregateType: 'SHIPMENT',
        aggregateId: testShipmentId,
        eventType: 'SHIPMENT_CREATED',
      },
    });
    expect(outboxEvent).toBeDefined();
    expect((outboxEvent?.payload as any)?.trackingCode).toBe('LAD-TEST-E2E-789');
  });

  it('STAGE 3: Nhận Webhook GHN - Ánh xạ trạng thái và cô lập mã bất thường vào EXCEPTION', () => {
    // 3.1 Webhook giao hàng thành công
    const deliveredPayload = {
      OrderCode: 'LAD-TEST-E2E-789',
      Status: 'delivered',
      Time: '2026-11-16T17:00:00Z',
    };
    const parsedDelivered = ghnProvider.parseWebhook(deliveredPayload, {});
    expect(parsedDelivered.status).toBe('DELIVERED');
    expect(parsedDelivered.trackingCode).toBe('LAD-TEST-E2E-789');

    // 3.2 Webhook shipper đang đi giao
    const deliveringPayload = {
      OrderCode: 'LAD-TEST-E2E-789',
      Status: 'delivering',
    };
    const parsedDelivering = ghnProvider.parseWebhook(deliveringPayload, {});
    expect(parsedDelivering.status).toBe('OUT_FOR_DELIVERY');

    // 3.3 [CRITICAL CORRECTION]: Mã trạng thái lạ => Bắt buộc chuyển về EXCEPTION
    const weirdPayload = {
      OrderCode: 'LAD-TEST-E2E-789',
      Status: 'hub_fire_evacuated', // Mã bất thường không có trong từ điển
    };
    const parsedWeird = ghnProvider.parseWebhook(weirdPayload, {});
    expect(parsedWeird.status).toBe('EXCEPTION');
    expect(parsedWeird.status).not.toBe('IN_TRANSIT');
  });
});
