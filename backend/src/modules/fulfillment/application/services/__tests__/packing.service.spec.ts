import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { OUTBOX_WRITER } from '@modules/async-infrastructure';
import { PackingService } from '../packing.service';
import { CompletePackingDto } from '../../../presentation/dtos/packing.dto';

describe('PackingService (EP04-T02)', () => {
  let service: PackingService;
  let prisma: any;
  let outboxWriter: any;

  const mockFulfillmentOrderId = 'fo-uuid-1111';
  const mockOrderId = 'order-uuid-2222';
  const mockVariantId1 = 'variant-uuid-0001';
  const mockVariantId2 = 'variant-uuid-0002';
  const mockUserId = 'user-uuid-pack-9999';

  const basePickedFO = {
    id: mockFulfillmentOrderId,
    orderId: mockOrderId,
    fulfillmentOrderNumber: 'FO-20261116-0001',
    sourceLocationId: 'wh-tb-uuid',
    status: 'PICKED',
    shippingServiceCode: 'STANDARD',
    totalItemsCount: 3,
    assignedPickerId: 'picker-uuid-1',
    allocatedAt: new Date(),
    pickedAt: new Date(),
    packedAt: null,
    handedOverAt: null,
    order: {
      id: mockOrderId,
      orderNumber: 'ORD-20261116-0001',
      payments: [
        {
          paymentMethod: 'VNPAY',
          amount: new Prisma.Decimal(500000),
          status: 'SUCCESS',
        },
      ],
    },
    items: [
      {
        id: 'fo-item-1',
        fulfillmentOrderId: mockFulfillmentOrderId,
        orderItemId: 'order-item-1',
        productVariantId: mockVariantId1,
        quantityRequested: 2,
        quantityFulfilled: 2,
      },
      {
        id: 'fo-item-2',
        fulfillmentOrderId: mockFulfillmentOrderId,
        orderItemId: 'order-item-2',
        productVariantId: mockVariantId2,
        quantityRequested: 1,
        quantityFulfilled: 1,
      },
    ],
    packages: [],
    shipments: [],
  };

  beforeEach(async () => {
    prisma = {
      fulfillmentOrder: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      shipment: {
        create: jest.fn(),
      },
      package: {
        create: jest.fn(),
      },
      packageItem: {
        create: jest.fn(),
      },
      shipmentPackage: {
        create: jest.fn(),
      },
      $transaction: jest.fn(async (cb) => {
        return cb(prisma);
      }),
    };

    outboxWriter = {
      record: jest.fn().mockResolvedValue({ id: 'outbox-uuid-1' }),
      recordMany: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PackingService,
        { provide: PrismaService, useValue: prisma },
        { provide: OUTBOX_WRITER, useValue: outboxWriter },
      ],
    }).compile();

    service = module.get<PackingService>(PackingService);
  });

  describe('Validation & Error Handling', () => {
    it('phải ném NotFoundException nếu FulfillmentOrder không tồn tại', async () => {
      prisma.fulfillmentOrder.findUnique.mockResolvedValue(null);

      const dto: CompletePackingDto = {
        packages: [
          {
            actualWeightGrams: 500,
            lengthCm: 20,
            widthCm: 15,
            heightCm: 10,
            items: [{ productVariantId: mockVariantId1, quantity: 2 }],
          },
        ],
      };

      await expect(
        service.completePacking('non-existent-fo', dto, mockUserId),
      ).rejects.toThrow(NotFoundException);
    });

    it('phải ném BadRequestException nếu FulfillmentOrder chưa ở trạng thái PICKED (ví dụ: ALLOCATED)', async () => {
      prisma.fulfillmentOrder.findUnique.mockResolvedValue({
        ...basePickedFO,
        status: 'ALLOCATED',
      });

      const dto: CompletePackingDto = {
        packages: [
          {
            actualWeightGrams: 500,
            lengthCm: 20,
            widthCm: 15,
            heightCm: 10,
            items: [{ productVariantId: mockVariantId1, quantity: 2 }],
          },
        ],
      };

      await expect(
        service.completePacking(mockFulfillmentOrderId, dto, mockUserId),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.completePacking(mockFulfillmentOrderId, dto, mockUserId),
      ).rejects.toThrow(/trạng thái PICKED/);
    });

    it('phải ném BadRequestException nếu danh sách packages rỗng', async () => {
      prisma.fulfillmentOrder.findUnique.mockResolvedValue(basePickedFO);

      const dto: CompletePackingDto = {
        packages: [],
      };

      await expect(
        service.completePacking(mockFulfillmentOrderId, dto, mockUserId),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.completePacking(mockFulfillmentOrderId, dto, mockUserId),
      ).rejects.toThrow(/ít nhất 1 kiện hàng/);
    });

    it('phải ném BadRequestException nếu cân nặng thực tế <= 0 (AC2)', async () => {
      prisma.fulfillmentOrder.findUnique.mockResolvedValue(basePickedFO);

      const dto: CompletePackingDto = {
        packages: [
          {
            actualWeightGrams: 0,
            lengthCm: 20,
            widthCm: 15,
            heightCm: 10,
            items: [{ productVariantId: mockVariantId1, quantity: 2 }],
          },
        ],
      };

      await expect(
        service.completePacking(mockFulfillmentOrderId, dto, mockUserId),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.completePacking(mockFulfillmentOrderId, dto, mockUserId),
      ).rejects.toThrow(/trọng lượng thực tế lớn hơn 0 gram/);
    });

    it('phải ném BadRequestException nếu kích thước thực tế <= 0 (AC2)', async () => {
      prisma.fulfillmentOrder.findUnique.mockResolvedValue(basePickedFO);

      const dto: CompletePackingDto = {
        packages: [
          {
            actualWeightGrams: 500,
            lengthCm: 20,
            widthCm: 0, // Invalid width
            heightCm: 10,
            items: [{ productVariantId: mockVariantId1, quantity: 2 }],
          },
        ],
      };

      await expect(
        service.completePacking(mockFulfillmentOrderId, dto, mockUserId),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.completePacking(mockFulfillmentOrderId, dto, mockUserId),
      ).rejects.toThrow(/kích thước thực tế/);
    });

    it('phải ném BadRequestException nếu đóng gói sản phẩm không thuộc đơn hàng', async () => {
      prisma.fulfillmentOrder.findUnique.mockResolvedValue(basePickedFO);

      const dto: CompletePackingDto = {
        packages: [
          {
            actualWeightGrams: 500,
            lengthCm: 20,
            widthCm: 15,
            heightCm: 10,
            items: [
              { productVariantId: 'foreign-variant-999', quantity: 1 },
            ],
          },
        ],
      };

      await expect(
        service.completePacking(mockFulfillmentOrderId, dto, mockUserId),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.completePacking(mockFulfillmentOrderId, dto, mockUserId),
      ).rejects.toThrow(/ITEM_NOT_FOUND_IN_ORDER/);
    });

    it('phải ném BadRequestException nếu số lượng đóng gói không khớp (QUANTITY_MISMATCH)', async () => {
      prisma.fulfillmentOrder.findUnique.mockResolvedValue(basePickedFO);

      // Yêu cầu: variant1: 2, variant2: 1. Nhưng chỉ đóng gói variant1: 1
      const dto: CompletePackingDto = {
        packages: [
          {
            actualWeightGrams: 500,
            lengthCm: 20,
            widthCm: 15,
            heightCm: 10,
            items: [
              { productVariantId: mockVariantId1, quantity: 1 },
              { productVariantId: mockVariantId2, quantity: 1 },
            ],
          },
        ],
      };

      await expect(
        service.completePacking(mockFulfillmentOrderId, dto, mockUserId),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.completePacking(mockFulfillmentOrderId, dto, mockUserId),
      ).rejects.toThrow(/QUANTITY_MISMATCH/);
    });
  });

  describe('Đóng Gói Thành Công (AC1 & AC2)', () => {
    it('phải đóng gói thành công 1 package với đầy đủ kích thước, trọng lượng thực tế và tạo Shipment GHN (AC1 & AC2)', async () => {
      prisma.fulfillmentOrder.findUnique.mockResolvedValue(basePickedFO);

      const mockCreatedShipment = {
        id: 'shipment-uuid-1',
        orderId: mockOrderId,
        fulfillmentOrderId: mockFulfillmentOrderId,
        shipmentCode: 'SHIP-20261116-1234',
        carrierCode: 'GHN',
        carrierServiceCode: 'STANDARD',
        codAmount: new Prisma.Decimal(0),
        status: 'PENDING_CREATION',
      };

      const mockCreatedPackage = {
        id: 'package-uuid-1',
        fulfillmentOrderId: mockFulfillmentOrderId,
        packageCode: 'PKG-20261116-0001',
        actualWeightGrams: 750,
        lengthCm: 25,
        widthCm: 18,
        heightCm: 12,
        packedBy: mockUserId,
        sealedAt: new Date(),
      };

      prisma.shipment.create.mockResolvedValue(mockCreatedShipment);
      prisma.package.create.mockResolvedValue(mockCreatedPackage);
      prisma.packageItem.create.mockResolvedValue({ id: 'pi-1' });
      prisma.shipmentPackage.create.mockResolvedValue({ id: 'sp-1' });
      prisma.fulfillmentOrder.update.mockResolvedValue({
        ...basePickedFO,
        status: 'PACKED',
        packedAt: new Date(),
      });

      const dto: CompletePackingDto = {
        packages: [
          {
            packageCode: 'PKG-20261116-0001',
            actualWeightGrams: 750,
            lengthCm: 25,
            widthCm: 18,
            heightCm: 12,
            items: [
              { productVariantId: mockVariantId1, quantity: 2 },
              { productVariantId: mockVariantId2, quantity: 1 },
            ],
          },
        ],
      };

      const result = await service.completePacking(
        mockFulfillmentOrderId,
        dto,
        mockUserId,
      );

      expect(result.success).toBe(true);
      expect(result.status).toBe('PACKED');
      expect(result.carrierCode).toBe('GHN');
      expect(result.totalPackagesCount).toBe(1);
      expect(result.packages[0].actualWeightGrams).toBe(750);
      expect(result.packages[0].lengthCm).toBe(25);
      expect(result.packages[0].widthCm).toBe(18);
      expect(result.packages[0].heightCm).toBe(12);

      // Verify Shipment created
      expect(prisma.shipment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          orderId: mockOrderId,
          fulfillmentOrderId: mockFulfillmentOrderId,
          carrierCode: 'GHN',
          carrierServiceCode: 'STANDARD',
          status: 'PENDING_CREATION',
        }),
      });

      // Verify Package created
      expect(prisma.package.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          fulfillmentOrderId: mockFulfillmentOrderId,
          actualWeightGrams: 750,
          lengthCm: 25,
          widthCm: 18,
          heightCm: 12,
        }),
      });

      // Verify FO status updated to PACKED
      expect(prisma.fulfillmentOrder.update).toHaveBeenCalledWith({
        where: { id: mockFulfillmentOrderId },
        data: expect.objectContaining({
          status: 'PACKED',
        }),
      });

      // Verify Outbox Event recorded
      expect(outboxWriter.record).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          aggregateType: 'FULFILLMENT_ORDER',
          aggregateId: mockFulfillmentOrderId,
          eventType: 'SHIPMENT_DISPATCH_REQUESTED',
        }),
      );
    });

    it('phải đóng gói thành công nhiều packages (2 kiện) cho 1 đơn hàng FO (AC1)', async () => {
      prisma.fulfillmentOrder.findUnique.mockResolvedValue(basePickedFO);

      const mockCreatedShipment = {
        id: 'shipment-uuid-split',
        orderId: mockOrderId,
        fulfillmentOrderId: mockFulfillmentOrderId,
        shipmentCode: 'SHIP-20261116-9999',
        carrierCode: 'GHN',
        status: 'PENDING_CREATION',
      };

      prisma.shipment.create.mockResolvedValue(mockCreatedShipment);
      prisma.package.create
        .mockResolvedValueOnce({
          id: 'pkg-1',
          packageCode: 'PKG-BOX-1',
          actualWeightGrams: 500,
          lengthCm: 20,
          widthCm: 15,
          heightCm: 10,
          sealedAt: new Date(),
        })
        .mockResolvedValueOnce({
          id: 'pkg-2',
          packageCode: 'PKG-BOX-2',
          actualWeightGrams: 300,
          lengthCm: 15,
          widthCm: 10,
          heightCm: 8,
          sealedAt: new Date(),
        });
      prisma.packageItem.create.mockResolvedValue({ id: 'pi-x' });
      prisma.shipmentPackage.create.mockResolvedValue({ id: 'sp-x' });
      prisma.fulfillmentOrder.update.mockResolvedValue({
        ...basePickedFO,
        status: 'PACKED',
      });

      const dto: CompletePackingDto = {
        packages: [
          {
            packageCode: 'PKG-BOX-1',
            actualWeightGrams: 500,
            lengthCm: 20,
            widthCm: 15,
            heightCm: 10,
            items: [{ productVariantId: mockVariantId1, quantity: 2 }],
          },
          {
            packageCode: 'PKG-BOX-2',
            actualWeightGrams: 300,
            lengthCm: 15,
            widthCm: 10,
            heightCm: 8,
            items: [{ productVariantId: mockVariantId2, quantity: 1 }],
          },
        ],
      };

      const result = await service.completePacking(
        mockFulfillmentOrderId,
        dto,
        mockUserId,
      );

      expect(result.success).toBe(true);
      expect(result.totalPackagesCount).toBe(2);
      expect(prisma.package.create).toHaveBeenCalledTimes(2);
      expect(prisma.shipmentPackage.create).toHaveBeenCalledTimes(2);
    });

    it('phải tự động gán carrierCode = AHAMOVE nếu shippingServiceCode = EXPRESS_2H', async () => {
      prisma.fulfillmentOrder.findUnique.mockResolvedValue({
        ...basePickedFO,
        shippingServiceCode: 'EXPRESS_2H',
      });

      const mockCreatedShipment = {
        id: 'shipment-express',
        orderId: mockOrderId,
        fulfillmentOrderId: mockFulfillmentOrderId,
        shipmentCode: 'SHIP-EXP-001',
        carrierCode: 'AHAMOVE',
        carrierServiceCode: 'EXPRESS_2H',
        status: 'PENDING_CREATION',
      };

      prisma.shipment.create.mockResolvedValue(mockCreatedShipment);
      prisma.package.create.mockResolvedValue({
        id: 'pkg-exp',
        packageCode: 'PKG-EXP',
        actualWeightGrams: 400,
        lengthCm: 15,
        widthCm: 15,
        heightCm: 10,
        sealedAt: new Date(),
      });
      prisma.packageItem.create.mockResolvedValue({ id: 'pi-exp' });
      prisma.shipmentPackage.create.mockResolvedValue({ id: 'sp-exp' });
      prisma.fulfillmentOrder.update.mockResolvedValue({
        ...basePickedFO,
        status: 'PACKED',
      });

      const dto: CompletePackingDto = {
        packages: [
          {
            actualWeightGrams: 400,
            lengthCm: 15,
            widthCm: 15,
            heightCm: 10,
            items: [
              { productVariantId: mockVariantId1, quantity: 2 },
              { productVariantId: mockVariantId2, quantity: 1 },
            ],
          },
        ],
      };

      const result = await service.completePacking(
        mockFulfillmentOrderId,
        dto,
        mockUserId,
      );

      expect(result.carrierCode).toBe('AHAMOVE');
      expect(prisma.shipment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          carrierCode: 'AHAMOVE',
          carrierServiceCode: 'EXPRESS_2H',
        }),
      });
    });

    it('phải xử lý idempotent khi đơn đã ở trạng thái PACKED', async () => {
      const alreadyPackedFO = {
        ...basePickedFO,
        status: 'PACKED',
        packedAt: new Date(),
        packages: [
          {
            id: 'pkg-exist-1',
            packageCode: 'PKG-EXIST-1',
            actualWeightGrams: 600,
            lengthCm: 20,
            widthCm: 15,
            heightCm: 10,
            sealedAt: new Date(),
            items: [
              { productVariantId: mockVariantId1, quantity: 2 },
              { productVariantId: mockVariantId2, quantity: 1 },
            ],
          },
        ],
        shipments: [
          {
            id: 'shipment-exist-1',
            shipmentCode: 'SHIP-EXIST-1',
            carrierCode: 'GHN',
            status: 'PENDING_CREATION',
          },
        ],
      };

      prisma.fulfillmentOrder.findUnique.mockResolvedValue(alreadyPackedFO);

      const dto: CompletePackingDto = {
        packages: [
          {
            actualWeightGrams: 600,
            lengthCm: 20,
            widthCm: 15,
            heightCm: 10,
            items: [
              { productVariantId: mockVariantId1, quantity: 2 },
              { productVariantId: mockVariantId2, quantity: 1 },
            ],
          },
        ],
      };

      const result = await service.completePacking(
        mockFulfillmentOrderId,
        dto,
        mockUserId,
      );

      expect(result.success).toBe(true);
      expect(result.status).toBe('PACKED');
      expect(result.shipmentCode).toBe('SHIP-EXIST-1');
      // Không gọi tạo mới khi đã packed
      expect(prisma.shipment.create).not.toHaveBeenCalled();
      expect(prisma.package.create).not.toHaveBeenCalled();
    });
  });
});
