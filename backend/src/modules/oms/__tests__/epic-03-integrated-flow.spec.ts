import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { PrismaModule } from '@infrastructure/database/prisma.module';
import { AsyncInfrastructureModule } from '@modules/async-infrastructure';
import { InventoryModule } from '@modules/inventory/inventory.module';
import { DistanceCalculatorService } from '../application/services/distance-calculator.service';
import { ShippingQuoteService } from '../application/services/shipping-quote.service';
import { HybridOrderRouter } from '../application/routing/hybrid-order-router';
import { CreateOrderUseCase } from '../application/use-cases/create-order.use-case';
import { OrderStateAggregator } from '../application/services/order-state-aggregator';
import { ConfigModule } from '@nestjs/config';

describe('EPIC 03: End-to-End Cohesive Integrated Lifecycle Flow', () => {
  let prisma: PrismaService;
  let distanceCalculator: DistanceCalculatorService;
  let shippingQuoteService: ShippingQuoteService;
  let router: HybridOrderRouter;
  let createOrderUseCase: CreateOrderUseCase;
  let stateAggregator: OrderStateAggregator;

  // Test Entities
  let centralWhId: string;
  let showroomDist1Id: string;
  let variant1Id: string;
  let variant2Id: string;
  let testCustomerId: string;

  const cleanupCustomerOrders = async (customerId: string) => {
    const testOrders = await prisma.order.findMany({
      where: { customerId },
      select: { id: true },
    });
    const testOrderIds = testOrders.map((o) => o.id);

    if (testOrderIds.length > 0) {
      const testFos = await prisma.fulfillmentOrder.findMany({
        where: { orderId: { in: testOrderIds } },
        select: { id: true },
      });
      const testFoIds = testFos.map((f) => f.id);

      const testShipments = await prisma.shipment.findMany({
        where: { orderId: { in: testOrderIds } },
        select: { id: true },
      });
      const testShipmentIds = testShipments.map((s) => s.id);
      if (testShipmentIds.length > 0) {
        await prisma.shipmentEvent.deleteMany({
          where: { shipmentId: { in: testShipmentIds } },
        });
        await prisma.shipment.deleteMany({
          where: { id: { in: testShipmentIds } },
        });
      }

      await prisma.orderStatusHistory.deleteMany({ where: { orderId: { in: testOrderIds } } });
      await prisma.fulfillmentOrderItem.deleteMany({
        where: { fulfillmentOrderId: { in: testFoIds } },
      });
      await prisma.inventoryReservationItem.deleteMany({
        where: { reservation: { fulfillmentOrderId: { in: testFoIds } } },
      });
      await prisma.inventoryReservation.deleteMany({
        where: { fulfillmentOrderId: { in: testFoIds } },
      });
      await prisma.fulfillmentOrder.deleteMany({ where: { id: { in: testFoIds } } });
      await prisma.orderItem.deleteMany({ where: { orderId: { in: testOrderIds } } });
      await prisma.order.deleteMany({ where: { id: { in: testOrderIds } } });
    }

    await prisma.outboxEvent.deleteMany({
      where: {
        aggregateType: { in: ['ORDER', 'INVENTORY_RESERVATION', 'FULFILLMENT_ORDER'] },
      },
    });
  };

  beforeAll(async () => {
    jest.setTimeout(60000);

    // 1. Khởi tạo Testing Module
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot(), PrismaModule, InventoryModule, AsyncInfrastructureModule],
      providers: [
        DistanceCalculatorService,
        ShippingQuoteService,
        HybridOrderRouter,
        CreateOrderUseCase,
        OrderStateAggregator,
      ],
    }).compile();

    prisma = module.get<PrismaService>(PrismaService);
    distanceCalculator = module.get<DistanceCalculatorService>(DistanceCalculatorService);
    shippingQuoteService = module.get<ShippingQuoteService>(ShippingQuoteService);
    router = module.get<HybridOrderRouter>(HybridOrderRouter);
    createOrderUseCase = module.get<CreateOrderUseCase>(CreateOrderUseCase);
    stateAggregator = module.get<OrderStateAggregator>(OrderStateAggregator);

    // 2. Lấy Kho Tổng Tân Bình (WH-TB) và Showroom Quận 1 (STORE-03)
    const centralWh = await prisma.store.findUnique({
      where: { code: 'WH-TB' },
    });
    if (!centralWh) throw new Error('Không tìm thấy Kho tổng WH-TB!');
    centralWhId = centralWh.id;

    const showroomDist1 = await prisma.store.findUnique({
      where: { code: 'STORE-03' },
    });
    if (!showroomDist1) throw new Error('Không tìm thấy Showroom STORE-03!');
    showroomDist1Id = showroomDist1.id;

    // 3. Tạo 2 Product Variants độc lập cho E2E Split Flow
    const product = await prisma.product.findFirst({ select: { id: true } });
    if (!product) throw new Error('Không tìm thấy product mẫu trong DB!');

    const v1 = await prisma.productVariant.upsert({
      where: { sku: 'TEST-E2E-VAR-1' },
      update: { price: 300000, costPrice: 200000, minShelfLifeDays: 180, isActive: true, option1Value: 'E2E-Opt1' },
      create: {
        productId: product.id,
        sku: 'TEST-E2E-VAR-1',
        option1Value: 'E2E-Opt1',
        price: 300000,
        costPrice: 200000,
        minShelfLifeDays: 180,
        isActive: true,
      },
    });
    variant1Id = v1.id;

    const v2 = await prisma.productVariant.upsert({
      where: { sku: 'TEST-E2E-VAR-2' },
      update: { price: 350000, costPrice: 250000, minShelfLifeDays: 180, isActive: true, option1Value: 'E2E-Opt2' },
      create: {
        productId: product.id,
        sku: 'TEST-E2E-VAR-2',
        option1Value: 'E2E-Opt2',
        price: 350000,
        costPrice: 250000,
        minShelfLifeDays: 180,
        isActive: true,
      },
    });
    variant2Id = v2.id;

    // 4. Lấy hoặc tạo Customer hợp lệ
    let customer = await prisma.customer.findFirst({
      where: { phone: '0901234567' },
    });
    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          fullName: 'Test Customer E2E',
          phone: '0901234567',
        },
      });
    }
    testCustomerId = customer.id;
  });

  beforeEach(async () => {
    // 1. Dọn dẹp đơn hàng test trước đó
    await cleanupCustomerOrders(testCustomerId);

    // 2. Dọn dẹp transactions, reservation items, lots và inventory cho 2 variant riêng biệt
    await prisma.inventoryTransaction.deleteMany({
      where: { productVariantId: { in: [variant1Id, variant2Id] } },
    });
    await prisma.inventoryReservationItem.deleteMany({
      where: { productVariantId: { in: [variant1Id, variant2Id] } },
    });
    await prisma.inventoryLot.deleteMany({
      where: { productVariantId: { in: [variant1Id, variant2Id] } },
    });
    await prisma.inventory.deleteMany({
      where: { productVariantId: { in: [variant1Id, variant2Id] } },
    });

    // 3. Thiết lập tồn kho và lô hàng chuẩn:
    // Kho Tổng WH-TB: Có 50 cái Variant 1, 0 cái Variant 2
    await prisma.inventory.create({
      data: { storeId: centralWhId, productVariantId: variant1Id, quantity: 50, reservedQuantity: 0, safetyStock: 0, quarantinedQuantity: 0, damagedQuantity: 0 },
    });
    await prisma.inventory.create({
      data: { storeId: centralWhId, productVariantId: variant2Id, quantity: 0, reservedQuantity: 0, safetyStock: 0, quarantinedQuantity: 0, damagedQuantity: 0 },
    });

    // Showroom STORE-03: Có 0 cái Variant 1, 50 cái Variant 2
    await prisma.inventory.create({
      data: { storeId: showroomDist1Id, productVariantId: variant1Id, quantity: 0, reservedQuantity: 0, safetyStock: 0, quarantinedQuantity: 0, damagedQuantity: 0 },
    });
    await prisma.inventory.create({
      data: { storeId: showroomDist1Id, productVariantId: variant2Id, quantity: 50, reservedQuantity: 0, safetyStock: 0, quarantinedQuantity: 0, damagedQuantity: 0 },
    });

    // Tạo các Lô hàng (InventoryLot) với HSD > 180 ngày để FEFO phân bổ
    const futureDate = new Date(Date.now() + 300 * 86_400_000);
    await prisma.inventoryLot.create({
      data: {
        locationId: centralWhId,
        productVariantId: variant1Id,
        batchCode: 'LOT-CENTRAL-VAR1',
        expiryDate: futureDate,
        quantityOnHand: 50,
        quantityReserved: 0,
      },
    });
    await prisma.inventoryLot.create({
      data: {
        locationId: showroomDist1Id,
        productVariantId: variant2Id,
        batchCode: 'LOT-D1-VAR2',
        expiryDate: futureDate,
        quantityOnHand: 50,
        quantityReserved: 0,
      },
    });
  }, 30000);

  afterAll(async () => {
    await cleanupCustomerOrders(testCustomerId);
    await prisma.inventoryTransaction.deleteMany({
      where: { productVariantId: { in: [variant1Id, variant2Id] } },
    });
    await prisma.inventoryReservationItem.deleteMany({
      where: { productVariantId: { in: [variant1Id, variant2Id] } },
    });
    await prisma.inventoryLot.deleteMany({
      where: { productVariantId: { in: [variant1Id, variant2Id] } },
    });
    await prisma.inventory.deleteMany({
      where: { productVariantId: { in: [variant1Id, variant2Id] } },
    });
    await prisma.$disconnect();
  }, 30000);

  it(
    'Flow 1: Khách đặt đơn đơn lẻ (Single FO) -> Báo giá -> Tạo đơn & Reservation -> Giao hàng -> Tự động hoàn tất 24h',
    async () => {
      // 1. Khách xin báo giá vận chuyển đến Quận 7
      const quoteResponse = await shippingQuoteService.calculateQuotes({
        shippingAddress: {
          provinceCity: 'Hồ Chí Minh',
          district: 'Quận 7',
          ward: 'Tân Phong',
          addressLine: '15 Nguyễn Thị Thập',
        },
        items: [{ variantId: variant1Id, quantity: 2 }],
      });

      expect(quoteResponse.quoteGroupId).toBeDefined();
      expect(quoteResponse.options.length).toBeGreaterThan(0);
      const selectedQuote =
        quoteResponse.options.find((o) => o.carrierCode === 'GHN') || quoteResponse.options[0];
      expect(selectedQuote.carrierCode).toBe('GHN');
      expect(selectedQuote.estimatedFee).toBe(22000); // Cùng tỉnh HCM

      // 2. Tạo đơn hàng với CreateOrderUseCase
      const orderResult = await createOrderUseCase.execute({
        customerId: testCustomerId,
        quoteGroupId: quoteResponse.quoteGroupId,
        shippingServiceCode: 'STANDARD',
        paymentMethod: 'COD',
        shippingAddress: {
          provinceCity: 'Hồ Chí Minh',
          district: 'Quận 7',
          ward: 'Tân Phong',
          addressLine: '15 Nguyễn Thị Thập',
          receiverName: 'Nguyễn Văn Test',
          phoneNumber: '0901234567',
        },
        items: [{ variantId: variant1Id, quantity: 2 }],
      });

      expect(orderResult.orderId).toBeDefined();
      expect(orderResult.status).toBe('CONFIRMED');
      expect(orderResult.fulfillmentOrders.length).toBe(1);
      expect(orderResult.fulfillmentOrders[0].status).toBe('ALLOCATED');
      expect(orderResult.fulfillmentOrders[0].sourceLocationId).toBe(centralWhId);

      // Kiểm tra Outbox Event ORDER_RESERVED được ghi nhận
      const outboxEvents = await prisma.outboxEvent.findMany({
        where: { aggregateId: orderResult.orderId },
      });
      expect(outboxEvents.some((e) => e.eventType === 'ORDER_RESERVED')).toBe(true);

      // 3. Tiến trình kho (WMS): ALLOCATED -> HANDED_OVER
      const foId = orderResult.fulfillmentOrders[0].id;
      await prisma.fulfillmentOrder.update({
        where: { id: foId },
        data: { status: 'HANDED_OVER' },
      });

      // Gọi OrderStateAggregator
      await stateAggregator.computeOrderStatus(orderResult.orderId);
      let orderDb = await prisma.order.findUnique({ where: { id: orderResult.orderId } });
      expect(orderDb?.status).toBe('SHIPPED');

      // 4. Đối tác 3PL giao hàng: Tạo Shipment & Chuyển sang DELIVERED
      await prisma.shipment.create({
        data: {
          orderId: orderResult.orderId,
          shipmentCode: `SHIP-${Date.now()}-01`,
          carrierCode: 'GHN',
          shippingFeePaid: 22000,
          status: 'DELIVERED',
          trackingCode: 'TEST-GHN-TRACK-01',
          deliveredAt: new Date(),
        },
      });

      await stateAggregator.computeOrderStatus(orderResult.orderId);
      orderDb = await prisma.order.findUnique({ where: { id: orderResult.orderId } });
      expect(orderDb?.status).toBe('DELIVERED');

      // 5. Kiểm tra tự động hoàn tất sau 24h (DEC-03)
      // Giả lập lùi thời gian cập nhật DELIVERED về 25 tiếng trước
      const delivered25HoursAgo = new Date(Date.now() - 25 * 60 * 60 * 1000);
      await prisma.order.update({
        where: { id: orderResult.orderId },
        data: { updatedAt: delivered25HoursAgo },
      });

      const autoCompletedCount = await stateAggregator.processAutoCompletion();
      expect(autoCompletedCount).toBeGreaterThanOrEqual(1);

      orderDb = await prisma.order.findUnique({ where: { id: orderResult.orderId } });
      expect(orderDb?.status).toBe('COMPLETED');
    },
    60000,
  );

  it(
    'Flow 2: Khách đặt đơn đa kho (Split Fulfillment - DEC-02) -> 2 FOs -> Giao 1 phần (AC1) -> Giao toàn bộ (AC2)',
    async () => {
      // Giỏ hàng gồm: 1x Variant 1 (300k, tại Central WH) + 1x Variant 2 (350k, tại Showroom D1)
      // Tổng giá trị hàng: 650.000đ >= 500.000đ (Đủ điều kiện DEC-02)
      const quoteResponse = await shippingQuoteService.calculateQuotes({
        shippingAddress: {
          provinceCity: 'Hồ Chí Minh',
          district: 'Quận 1',
          ward: 'Bến Nghé',
          addressLine: '150 Lê Thánh Tôn',
        },
        items: [
          { variantId: variant1Id, quantity: 1 },
          { variantId: variant2Id, quantity: 1 },
        ],
      });

      // Tạo đơn hàng chia 2 kho
      const orderResult = await createOrderUseCase.execute({
        customerId: testCustomerId,
        quoteGroupId: quoteResponse.quoteGroupId,
        shippingServiceCode: 'STANDARD',
        paymentMethod: 'ONLINE',
        shippingAddress: {
          provinceCity: 'Hồ Chí Minh',
          district: 'Quận 1',
          ward: 'Bến Nghé',
          addressLine: '150 Lê Thánh Tôn',
          receiverName: 'Trần Thị Split',
          phoneNumber: '0909888999',
        },
        items: [
          { variantId: variant1Id, quantity: 1 },
          { variantId: variant2Id, quantity: 1 },
        ],
      });

      expect(orderResult.orderId).toBeDefined();
      // Phải tách thành đúng 2 Fulfillment Orders con
      expect(orderResult.fulfillmentOrders.length).toBe(2);
      const foStores = orderResult.fulfillmentOrders.map((f) => f.sourceLocationId).sort();
      expect(foStores).toEqual([centralWhId, showroomDist1Id].sort());

      const fo1 = orderResult.fulfillmentOrders[0];
      const fo2 = orderResult.fulfillmentOrders[1];

      // Cả 2 FO phải đều có trạng thái ALLOCATED
      expect(fo1.status).toBe('ALLOCATED');
      expect(fo2.status).toBe('ALLOCATED');

      // 2. Chuyển FO1 sang HANDED_OVER, FO2 vẫn đang xử lý
      await prisma.fulfillmentOrder.update({
        where: { id: fo1.id },
        data: { status: 'HANDED_OVER' },
      });
      await stateAggregator.computeOrderStatus(orderResult.orderId);
      let orderDb = await prisma.order.findUnique({ where: { id: orderResult.orderId } });
      expect(orderDb?.status).toBe('PARTIALLY_SHIPPED');

      // Chuyển tiếp FO2 sang HANDED_OVER -> Toàn bộ đơn là SHIPPED
      await prisma.fulfillmentOrder.update({
        where: { id: fo2.id },
        data: { status: 'HANDED_OVER' },
      });
      await stateAggregator.computeOrderStatus(orderResult.orderId);
      orderDb = await prisma.order.findUnique({ where: { id: orderResult.orderId } });
      expect(orderDb?.status).toBe('SHIPPED');

      // 3. Đánh giá AC1: Kiện 1 Giao thành công (DELIVERED), Kiện 2 Đang giao (IN_TRANSIT)
      await prisma.shipment.create({
        data: {
          orderId: orderResult.orderId,
          shipmentCode: `SHIP-SPLIT-${Date.now()}-01`,
          carrierCode: 'GHN',
          shippingFeePaid: 22000,
          status: 'DELIVERED',
          trackingCode: 'TEST-SPLIT-TRACK-01',
          deliveredAt: new Date(),
        },
      });
      await prisma.shipment.create({
        data: {
          orderId: orderResult.orderId,
          shipmentCode: `SHIP-SPLIT-${Date.now()}-02`,
          carrierCode: 'GHN',
          shippingFeePaid: 22000,
          status: 'IN_TRANSIT',
          trackingCode: 'TEST-SPLIT-TRACK-02',
        },
      });

      await stateAggregator.computeOrderStatus(orderResult.orderId);
      orderDb = await prisma.order.findUnique({ where: { id: orderResult.orderId } });
      // AC1: Order phải ở trạng thái PARTIALLY_DELIVERED
      expect(orderDb?.status).toBe('PARTIALLY_DELIVERED');

      // 4. Đánh giá AC2: Kiện 2 Giao thành công (DELIVERED) -> 100% Giao xong
      await prisma.shipment.updateMany({
        where: { orderId: orderResult.orderId, trackingCode: 'TEST-SPLIT-TRACK-02' },
        data: { status: 'DELIVERED', deliveredAt: new Date() },
      });

      await stateAggregator.computeOrderStatus(orderResult.orderId);
      orderDb = await prisma.order.findUnique({ where: { id: orderResult.orderId } });
      // AC2: Order chuyển thành công sang DELIVERED
      expect(orderDb?.status).toBe('DELIVERED');
    },
    60000,
  );

  it(
    'Flow 3: Ngăn chặn chia đơn khi giá trị hàng < 500k (DEC-02) -> Yêu cầu gom hàng nội bộ',
    async () => {
      // Tạm thời hạ giá Variant 1 và Variant 2 xuống tổng cộng < 500.000đ
      await prisma.productVariant.update({
        where: { id: variant1Id },
        data: { price: 200000 },
      });
      await prisma.productVariant.update({
        where: { id: variant2Id },
        data: { price: 200000 },
      });

      // 200k + 200k = 400k < 500k
      const quoteResponse = await shippingQuoteService.calculateQuotes({
        shippingAddress: {
          provinceCity: 'Hồ Chí Minh',
          district: 'Quận 1',
          ward: 'Bến Nghé',
          addressLine: '150 Lê Thánh Tôn',
        },
        items: [
          { variantId: variant1Id, quantity: 1 },
          { variantId: variant2Id, quantity: 1 },
        ],
      });

      // Thử tạo đơn hàng
      await expect(
        createOrderUseCase.execute({
          customerId: testCustomerId,
          quoteGroupId: quoteResponse.quoteGroupId,
          shippingServiceCode: 'STANDARD',
          paymentMethod: 'ONLINE',
          shippingAddress: {
            provinceCity: 'Hồ Chí Minh',
            district: 'Quận 1',
            ward: 'Bến Nghé',
            addressLine: '150 Lê Thánh Tôn',
            receiverName: 'Trần Thị Under500k',
            phoneNumber: '0909111222',
          },
          items: [
            { variantId: variant1Id, quantity: 1 },
            { variantId: variant2Id, quantity: 1 },
          ],
        }),
      ).rejects.toThrow(ConflictException);

      // Khôi phục lại giá gốc cho các test khác
      await prisma.productVariant.update({
        where: { id: variant1Id },
        data: { price: 300000 },
      });
      await prisma.productVariant.update({
        where: { id: variant2Id },
        data: { price: 350000 },
      });
    },
    60000,
  );

  it(
    'Flow 4: Bảo đảm toàn vẹn giao dịch ACID Rollback khi giữ chỗ kho con gặp sự cố',
    async () => {
      // Tạo 1 quote hợp lệ
      const quoteResponse = await shippingQuoteService.calculateQuotes({
        shippingAddress: {
          provinceCity: 'Hồ Chí Minh',
          district: 'Quận 1',
          ward: 'Bến Nghé',
          addressLine: '150 Lê Thánh Tôn',
        },
        items: [
          { variantId: variant1Id, quantity: 1 },
          { variantId: variant2Id, quantity: 1 },
        ],
      });

      // Mock spy tạm thời inventoryReservationService để cố tình ném ngoại lệ khi giữ chỗ kho thứ 2
      const reservationService = (createOrderUseCase as any).inventoryReservationService;
      let callCount = 0;
      const originalCreateRes = reservationService.createReservation.bind(reservationService);
      jest.spyOn(reservationService, 'createReservation').mockImplementation(async (tx, dto) => {
        callCount++;
        if (callCount === 2) {
          throw new Error('Mô phỏng sự cố khóa hàng tại kho con thứ hai!');
        }
        return originalCreateRes(tx, dto);
      });

      const initialOrderCount = await prisma.order.count({ where: { customerId: testCustomerId } });
      const initialFoCount = await prisma.fulfillmentOrder.count();

      // Thực thi create order -> Phải ném ngoại lệ
      await expect(
        createOrderUseCase.execute({
          customerId: testCustomerId,
          quoteGroupId: quoteResponse.quoteGroupId,
          shippingServiceCode: 'STANDARD',
          paymentMethod: 'ONLINE',
          shippingAddress: {
            provinceCity: 'Hồ Chí Minh',
            district: 'Quận 1',
            ward: 'Bến Nghé',
            addressLine: '150 Lê Thánh Tôn',
            receiverName: 'Lê Rollback Test',
            phoneNumber: '0909555666',
          },
          items: [
            { variantId: variant1Id, quantity: 1 },
            { variantId: variant2Id, quantity: 1 },
          ],
        }),
      ).rejects.toThrow('Mô phỏng sự cố khóa hàng tại kho con thứ hai!');

      // Kiểm tra ACID: Không có Order hoặc FO nào bị ghi lọt vào DB
      const finalOrderCount = await prisma.order.count({ where: { customerId: testCustomerId } });
      const finalFoCount = await prisma.fulfillmentOrder.count();

      expect(finalOrderCount).toBe(initialOrderCount);
      expect(finalFoCount).toBe(initialFoCount);

      // Phục hồi lại spy
      jest.restoreAllMocks();
    },
    60000,
  );
});
