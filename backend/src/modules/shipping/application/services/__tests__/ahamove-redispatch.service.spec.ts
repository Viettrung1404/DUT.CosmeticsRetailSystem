import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { IOutboxWriter, OUTBOX_WRITER } from '@modules/async-infrastructure';
import {
  AhamoveRedispatchService,
  MAX_AHAMOVE_REDISPATCH_ATTEMPTS,
} from '../ahamove-redispatch.service';
import { AhamoveProvider } from '../../../infrastructure/adapters/ahamove/ahamove-provider';

describe('AhamoveRedispatchService (EP07-T03)', () => {
  let service: AhamoveRedispatchService;
  let mockPrisma: any;
  let mockAhamoveProvider: Partial<AhamoveProvider>;
  let mockOutboxWriter: Partial<IOutboxWriter>;

  const mockShipment = {
    id: 'shipment-uuid-001',
    shipmentCode: 'SHIP-EXPRESS-001',
    orderId: 'order-uuid-001',
    carrierCode: 'AHAMOVE',
    trackingCode: '22VMV001',
    status: 'DRIVER_ASSIGNED',
    codAmount: 0,
    carrierMetadata: { redispatchCount: 0 },
    fulfillmentOrder: {
      sourceLocationId: 'store-uuid-001',
    },
    order: {
      shippingAddress: {
        fullName: 'Nguyễn Văn Test',
        phone: '0901234567',
        addressLine: '123 Test St',
        district: 'Quận 1',
        city: 'Hồ Chí Minh',
      },
    },
  };

  beforeEach(async () => {
    mockPrisma = {
      shipment: {
        findFirst: jest.fn().mockResolvedValue({ ...mockShipment }),
        update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ ...mockShipment, ...data })),
      },
      store: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'store-uuid-001',
          name: 'Showroom Q1',
          phone: '0281234567',
          address: '456 Showroom St',
          district: 'Quận 1',
          city: 'Hồ Chí Minh',
        }),
      },
      $transaction: jest.fn().mockImplementation(async (cb) => cb(mockPrisma)),
    };

    mockAhamoveProvider = {
      createShipment: jest.fn().mockResolvedValue({
        trackingCode: '22VMV002_NEW',
        carrierReferenceId: '22VMV002_NEW',
        carrierServiceCode: 'AHAMOVE_EXPRESS_2H',
        trackingUrl: 'https://ahamove.com/share/22VMV002_NEW',
        rawResponse: { order_id: '22VMV002_NEW' },
      }),
    };

    mockOutboxWriter = {
      record: jest.fn().mockResolvedValue(undefined),
      recordMany: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AhamoveRedispatchService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AhamoveProvider, useValue: mockAhamoveProvider },
        { provide: OUTBOX_WRITER, useValue: mockOutboxWriter },
      ],
    }).compile();

    service = module.get<AhamoveRedispatchService>(AhamoveRedispatchService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('AC1: Tài xế bấm hủy => Tự động tìm tài xế mới (Re-dispatch)', () => {
    it('should re-dispatch new driver successfully on first cancellation', async () => {
      const result = await service.handleDriverCancellation(
        '22VMV001',
        'Tài xế hỏng xe giữa đường',
      );

      expect(result.success).toBe(true);
      expect(result.reallocated).toBe(true);
      expect(result.attemptCount).toBe(1);
      expect(result.newTrackingCode).toBe('22VMV002_NEW');
      expect(result.status).toBe('CREATED');

      // Verify gọi Ahamove Provider tạo cuốc mới
      expect(mockAhamoveProvider.createShipment).toHaveBeenCalled();

      // Verify ghi nhận Outbox Event tài xế được chỉ định lại
      expect(mockOutboxWriter.record).toHaveBeenCalledWith(
        mockPrisma,
        expect.objectContaining({
          aggregateType: 'SHIPMENT',
          eventType: 'AHAMOVE_DRIVER_REASSIGNED',
          payload: expect.objectContaining({
            oldTrackingCode: '22VMV001',
            newTrackingCode: '22VMV002_NEW',
            attemptCount: 1,
          }),
        }),
      );
    });

    it('should allow second re-dispatch attempt if driver cancels again', async () => {
      // Giả lập đã từng re-dispatch 1 lần
      mockPrisma.shipment.findFirst.mockResolvedValue({
        ...mockShipment,
        trackingCode: '22VMV002_NEW',
        carrierMetadata: { redispatchCount: 1 },
      });

      const result = await service.handleDriverCancellation(
        '22VMV002_NEW',
        'Tài xế bận việc gia đình',
      );

      expect(result.success).toBe(true);
      expect(result.reallocated).toBe(true);
      expect(result.attemptCount).toBe(2);
      expect(result.status).toBe('CREATED');
    });
  });

  describe('Exhausted Attempts: Quá 2 lần thất bại => Chuyển DISPATCH_FAILED & Cảnh báo thủ công', () => {
    it('should mark DISPATCH_FAILED and record AHAMOVE_MANUAL_INTERVENTION_REQUIRED event after 2 failed attempts', async () => {
      // Giả lập đã thử 2 lần (đạt ngưỡng MAX_AHAMOVE_REDISPATCH_ATTEMPTS = 2)
      mockPrisma.shipment.findFirst.mockResolvedValue({
        ...mockShipment,
        trackingCode: '22VMV003_TRY2',
        carrierMetadata: { redispatchCount: 2 },
      });

      const result = await service.handleDriverCancellation(
        '22VMV003_TRY2',
        'Tài xế thứ 2 cũng từ chối',
      );

      expect(result.success).toBe(false);
      expect(result.reallocated).toBe(false);
      expect(result.attemptCount).toBe(2);
      expect(result.status).toBe('DISPATCH_FAILED');
      expect(result.message).toContain('Cần can thiệp thủ công');

      // Verify không gọi thêm Ahamove API
      expect(mockAhamoveProvider.createShipment).not.toHaveBeenCalled();

      // Verify ghi nhận Outbox Event cần can thiệp thủ công
      expect(mockOutboxWriter.record).toHaveBeenCalledWith(
        mockPrisma,
        expect.objectContaining({
          aggregateType: 'SHIPMENT',
          eventType: 'AHAMOVE_MANUAL_INTERVENTION_REQUIRED',
          payload: expect.objectContaining({
            attempts: 2,
            lastCancelReason: 'Tài xế thứ 2 cũng từ chối',
          }),
        }),
      );
    });
  });

  describe('Edge cases & Validation', () => {
    it('should throw NotFoundException if tracking code does not exist', async () => {
      mockPrisma.shipment.findFirst.mockResolvedValue(null);

      await expect(
        service.handleDriverCancellation('NON_EXISTENT_CODE'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should not re-dispatch if shipment is already DELIVERED', async () => {
      mockPrisma.shipment.findFirst.mockResolvedValue({
        ...mockShipment,
        status: 'DELIVERED',
      });

      const result = await service.handleDriverCancellation('22VMV001');
      expect(result.reallocated).toBe(false);
      expect(result.status).toBe('DELIVERED');
      expect(mockAhamoveProvider.createShipment).not.toHaveBeenCalled();
    });
  });
});
