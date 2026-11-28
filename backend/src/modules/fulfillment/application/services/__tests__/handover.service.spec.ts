import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { OUTBOX_WRITER } from '@modules/async-infrastructure';
import { OrderStateAggregator } from '@modules/oms/application/services/order-state-aggregator';
import { HandoverService } from '../handover.service';
import { ConfirmHandoverDto } from '../../../presentation/dtos/handover.dto';

describe('HandoverService (EP04-T03)', () => {
  let service: HandoverService;
  let prisma: any;
  let outboxWriter: any;
  let orderStateAggregator: any;

  const mockFulfillmentOrderId = 'fo-uuid-handover-1';
  const mockOrderId = 'order-uuid-handover-1';
  const mockShipmentId = 'shipment-uuid-handover-1';
  const mockUserId = 'staff-uuid-001';

  const basePackedFO = {
    id: mockFulfillmentOrderId,
    orderId: mockOrderId,
    fulfillmentOrderNumber: 'FO-20261116-0002',
    sourceLocationId: 'wh-tb-uuid',
    status: 'PACKED',
    shippingServiceCode: 'STANDARD',
    totalItemsCount: 2,
    allocatedAt: new Date(),
    pickedAt: new Date(),
    packedAt: new Date(),
    handedOverAt: null,
    order: {
      id: mockOrderId,
      orderNumber: 'ORD-20261116-0002',
      status: 'PROCESSING',
    },
    shipments: [
      {
        id: mockShipmentId,
        orderId: mockOrderId,
        fulfillmentOrderId: mockFulfillmentOrderId,
        shipmentCode: 'SHIP-20261116-001',
        trackingCode: 'GHN-TRK-987654',
        status: 'PENDING_CREATION',
      },
    ],
    packages: [
      {
        id: 'pkg-1',
        packageCode: 'PKG-001',
      },
    ],
  };

  beforeEach(async () => {
    prisma = {
      fulfillmentOrder: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      shipment: {
        update: jest.fn(),
      },
      $transaction: jest.fn(async (cb) => {
        return cb(prisma);
      }),
    };

    outboxWriter = {
      record: jest.fn().mockResolvedValue({ id: 'outbox-uuid-1' }),
      recordMany: jest.fn().mockResolvedValue(undefined),
    };

    orderStateAggregator = {
      computeOrderStatus: jest.fn().mockResolvedValue({
        orderId: mockOrderId,
        previousStatus: 'PROCESSING',
        newStatus: 'SHIPPED',
        hasChanged: true,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HandoverService,
        { provide: PrismaService, useValue: prisma },
        { provide: OUTBOX_WRITER, useValue: outboxWriter },
        { provide: OrderStateAggregator, useValue: orderStateAggregator },
      ],
    }).compile();

    service = module.get<HandoverService>(HandoverService);
  });

  describe('Validation & Error Handling', () => {
    it('phải ném NotFoundException nếu FulfillmentOrder không tồn tại', async () => {
      prisma.fulfillmentOrder.findUnique.mockResolvedValue(null);

      await expect(
        service.confirmHandover('non-existent-fo', {}, mockUserId),
      ).rejects.toThrow(NotFoundException);
    });

    it('phải ném BadRequestException nếu FulfillmentOrder chưa ở trạng thái PACKED (ví dụ: PICKED)', async () => {
      prisma.fulfillmentOrder.findUnique.mockResolvedValue({
        ...basePackedFO,
        status: 'PICKED',
      });

      await expect(
        service.confirmHandover(mockFulfillmentOrderId, {}, mockUserId),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.confirmHandover(mockFulfillmentOrderId, {}, mockUserId),
      ).rejects.toThrow(/trạng thái PACKED/);
    });

    it('phải ném BadRequestException nếu đơn hàng chưa có vận đơn liên kết', async () => {
      prisma.fulfillmentOrder.findUnique.mockResolvedValue({
        ...basePackedFO,
        shipments: [],
      });

      await expect(
        service.confirmHandover(mockFulfillmentOrderId, {}, mockUserId),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.confirmHandover(mockFulfillmentOrderId, {}, mockUserId),
      ).rejects.toThrow(/chưa có vận đơn/);
    });

    it('phải ném BadRequestException nếu kiện hàng chưa có mã vận đơn trackingCode từ 3PL (AC1)', async () => {
      prisma.fulfillmentOrder.findUnique.mockResolvedValue({
        ...basePackedFO,
        shipments: [
          {
            id: mockShipmentId,
            shipmentCode: 'SHIP-20261116-001',
            trackingCode: null, // Chưa có mã tracking từ 3PL
            status: 'PENDING_CREATION',
          },
        ],
      });

      await expect(
        service.confirmHandover(mockFulfillmentOrderId, {}, mockUserId),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.confirmHandover(mockFulfillmentOrderId, {}, mockUserId),
      ).rejects.toThrow(/SHIPMENT_NOT_READY: Kiện hàng chưa có mã vận đơn/);
    });

    it('phải ném BadRequestException nếu trackingCode là chuỗi rỗng (AC1)', async () => {
      prisma.fulfillmentOrder.findUnique.mockResolvedValue({
        ...basePackedFO,
        shipments: [
          {
            id: mockShipmentId,
            shipmentCode: 'SHIP-20261116-001',
            trackingCode: '   ', // Chuỗi rỗng
            status: 'PENDING_CREATION',
          },
        ],
      });

      await expect(
        service.confirmHandover(mockFulfillmentOrderId, {}, mockUserId),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.confirmHandover(mockFulfillmentOrderId, {}, mockUserId),
      ).rejects.toThrow(/SHIPMENT_NOT_READY/);
    });
  });

  describe('Bàn Giao Thành Công (AC2)', () => {
    it('phải bàn giao thành công cho tài xế và kích hoạt cập nhật trạng thái đơn cha (AC2)', async () => {
      prisma.fulfillmentOrder.findUnique.mockResolvedValue(basePackedFO);
      prisma.fulfillmentOrder.update.mockResolvedValue({
        ...basePackedFO,
        status: 'HANDED_OVER',
        handedOverAt: new Date(),
      });
      prisma.shipment.update.mockResolvedValue({
        ...basePackedFO.shipments[0],
        status: 'HANDED_OVER',
        handedOverAt: new Date(),
      });

      const dto: ConfirmHandoverDto = {
        driverName: 'Nguyễn Văn Tài',
        driverPhone: '0901234567',
        driverLicensePlate: '29C-12345',
        note: 'Bàn giao ca chiều cho bưu tá GHN',
      };

      const result = await service.confirmHandover(
        mockFulfillmentOrderId,
        dto,
        mockUserId,
      );

      expect(result.success).toBe(true);
      expect(result.status).toBe('HANDED_OVER');
      expect(result.trackingCode).toBe('GHN-TRK-987654');
      expect(result.orderStatus).toBe('SHIPPED');

      // Verify update FO
      expect(prisma.fulfillmentOrder.update).toHaveBeenCalledWith({
        where: { id: mockFulfillmentOrderId },
        data: expect.objectContaining({
          status: 'HANDED_OVER',
        }),
      });

      // Verify update Shipment
      expect(prisma.shipment.update).toHaveBeenCalledWith({
        where: { id: mockShipmentId },
        data: expect.objectContaining({
          status: 'HANDED_OVER',
        }),
      });

      // Verify OrderStateAggregator called
      expect(orderStateAggregator.computeOrderStatus).toHaveBeenCalledWith(
        mockOrderId,
        expect.anything(),
        expect.objectContaining({
          changedBy: mockUserId,
          note: expect.stringContaining('Nguyễn Văn Tài'),
        }),
      );

      // Verify Outbox Event recorded
      expect(outboxWriter.record).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          aggregateType: 'FULFILLMENT_ORDER',
          aggregateId: mockFulfillmentOrderId,
          eventType: 'FO_HANDED_OVER',
          payload: expect.objectContaining({
            fulfillmentOrderId: mockFulfillmentOrderId,
            trackingCode: 'GHN-TRK-987654',
            driverName: 'Nguyễn Văn Tài',
          }),
        }),
      );
    });

    it('phải xử lý idempotent khi đơn đã ở trạng thái HANDED_OVER', async () => {
      const alreadyHandedOverFO = {
        ...basePackedFO,
        status: 'HANDED_OVER',
        handedOverAt: new Date('2026-11-16T10:00:00Z'),
        order: {
          id: mockOrderId,
          status: 'SHIPPED',
        },
      };

      prisma.fulfillmentOrder.findUnique.mockResolvedValue(alreadyHandedOverFO);

      const result = await service.confirmHandover(
        mockFulfillmentOrderId,
        {},
        mockUserId,
      );

      expect(result.success).toBe(true);
      expect(result.status).toBe('HANDED_OVER');
      expect(result.orderStatus).toBe('SHIPPED');
      // Không update DB lại
      expect(prisma.fulfillmentOrder.update).not.toHaveBeenCalled();
      expect(prisma.shipment.update).not.toHaveBeenCalled();
      expect(outboxWriter.record).not.toHaveBeenCalled();
    });
  });
});
