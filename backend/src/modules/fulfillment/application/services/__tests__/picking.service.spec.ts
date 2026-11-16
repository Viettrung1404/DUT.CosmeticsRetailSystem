import { Test, TestingModule } from '@nestjs/testing';
import { PickingService } from '../picking.service';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';

describe('EP04-T01: PickingService Unit Tests', () => {
  let service: PickingService;
  let prisma: any;

  const mockFoId = 'fo-uuid-111';
  const mockVariantId = 'var-uuid-222';
  const mockLotId = 'lot-uuid-333';
  const mockBatchCode = 'BATCH-202611-001';

  beforeEach(async () => {
    prisma = {
      fulfillmentOrder: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      fulfillmentOrderItem: {
        update: jest.fn(),
      },
      $transaction: jest.fn(async (cb) => cb(prisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PickingService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<PickingService>(PickingService);
  });

  describe('1. getPickList', () => {
    it('phải trả về danh sách nhặt hàng chi tiết kèm mã lô FEFO chỉ định', async () => {
      prisma.fulfillmentOrder.findUnique.mockResolvedValue({
        id: mockFoId,
        fulfillmentOrderNumber: 'FO-20261116-0001',
        sourceLocationId: 'store-1',
        status: 'ALLOCATED',
        totalItemsCount: 5,
        sourceLocation: { id: 'store-1', name: 'Kho Tổng Tân Bình' },
        items: [
          {
            id: 'fo-item-1',
            productVariantId: mockVariantId,
            quantityRequested: 5,
            variant: {
              sku: 'SKU-SERUM-01',
              barcode: '893600000001',
              product: { name: 'Serum Phục Hồi Da B5' },
            },
          },
        ],
        reservation: {
          items: [
            {
              productVariantId: mockVariantId,
              lotId: mockLotId,
              quantity: 5,
              lot: {
                batchCode: mockBatchCode,
                expiryDate: new Date('2027-12-31'),
              },
              variant: {
                sku: 'SKU-SERUM-01',
                barcode: '893600000001',
                product: { name: 'Serum Phục Hồi Da B5' },
              },
            },
          ],
        },
      });

      const result = await service.getPickList(mockFoId);

      expect(result.fulfillmentOrderId).toBe(mockFoId);
      expect(result.items.length).toBe(1);
      expect(result.items[0].batchCode).toBe(mockBatchCode);
      expect(result.items[0].quantity).toBe(5);
      expect(result.items[0].sku).toBe('SKU-SERUM-01');
    });

    it('phải ném NotFoundException nếu không tìm thấy FulfillmentOrder', async () => {
      prisma.fulfillmentOrder.findUnique.mockResolvedValue(null);

      await expect(service.getPickList('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('2. startPicking', () => {
    it('phải chuyển trạng thái từ ALLOCATED sang PICKING và gán assignedPickerId', async () => {
      prisma.fulfillmentOrder.findUnique.mockResolvedValue({
        id: mockFoId,
        fulfillmentOrderNumber: 'FO-01',
        status: 'ALLOCATED',
        assignedPickerId: null,
      });

      prisma.fulfillmentOrder.update.mockResolvedValue({
        id: mockFoId,
        status: 'PICKING',
        assignedPickerId: 'picker-user-99',
      });

      const result = await service.startPicking(mockFoId, 'picker-user-99');

      expect(result.success).toBe(true);
      expect(result.status).toBe('PICKING');
      expect(result.assignedPickerId).toBe('picker-user-99');
      expect(prisma.fulfillmentOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockFoId },
          data: expect.objectContaining({
            status: 'PICKING',
            assignedPickerId: 'picker-user-99',
          }),
        }),
      );
    });

    it('phải xử lý idempotent khi đơn đã ở trạng thái PICKING', async () => {
      prisma.fulfillmentOrder.findUnique.mockResolvedValue({
        id: mockFoId,
        status: 'PICKING',
        assignedPickerId: 'picker-user-99',
      });

      const result = await service.startPicking(mockFoId, 'picker-user-99');

      expect(result.success).toBe(true);
      expect(result.status).toBe('PICKING');
      expect(prisma.fulfillmentOrder.update).not.toHaveBeenCalled();
    });

    it('phải ném ConflictException nếu đơn không ở trạng thái ALLOCATED', async () => {
      prisma.fulfillmentOrder.findUnique.mockResolvedValue({
        id: mockFoId,
        status: 'PACKED',
      });

      await expect(service.startPicking(mockFoId, 'picker-user-99')).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('3. completePicking', () => {
    const mockFoWithReservation = {
      id: mockFoId,
      fulfillmentOrderNumber: 'FO-01',
      status: 'PICKING',
      assignedPickerId: 'picker-99',
      items: [
        {
          id: 'fo-item-1',
          productVariantId: mockVariantId,
          quantityRequested: 3,
        },
      ],
      reservation: {
        items: [
          {
            productVariantId: mockVariantId,
            lotId: mockLotId,
            quantity: 3,
            lot: {
              batchCode: mockBatchCode,
            },
            productVariant: {
              id: mockVariantId,
            },
          },
        ],
      },
    };

    it('AC1: Quét sai mã lô (Batch Code) hệ thống báo lỗi BATCH_MISMATCH và từ chối hoàn thành', async () => {
      prisma.fulfillmentOrder.findUnique.mockResolvedValue(mockFoWithReservation);

      // Quét mã lô sai: 'WRONG-BATCH-CODE' thay vì mockBatchCode
      await expect(
        service.completePicking(mockFoId, {
          items: [
            {
              variantId: mockVariantId,
              batchCode: 'WRONG-BATCH-CODE',
              quantity: 3,
            },
          ],
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.completePicking(mockFoId, {
          items: [
            {
              variantId: mockVariantId,
              batchCode: 'WRONG-BATCH-CODE',
              quantity: 3,
            },
          ],
        }),
      ).rejects.toThrow(/BATCH_MISMATCH/);
    });

    it('phải báo lỗi QUANTITY_MISMATCH khi số lượng quét không đủ hoặc vượt mức', async () => {
      prisma.fulfillmentOrder.findUnique.mockResolvedValue(mockFoWithReservation);

      // Quét đúng mã lô nhưng thiếu số lượng: 2 thay vì 3
      await expect(
        service.completePicking(mockFoId, {
          items: [
            {
              variantId: mockVariantId,
              batchCode: mockBatchCode,
              quantity: 2,
            },
          ],
        }),
      ).rejects.toThrow(/QUANTITY_MISMATCH/);
    });

    it('AC2: Quét đủ số lượng và đúng lô -> FO chuyển sang PICKED', async () => {
      prisma.fulfillmentOrder.findUnique.mockResolvedValue(mockFoWithReservation);
      prisma.fulfillmentOrder.update.mockResolvedValue({
        id: mockFoId,
        status: 'PICKED',
      });
      prisma.fulfillmentOrderItem.update.mockResolvedValue({});

      const result = await service.completePicking(mockFoId, {
        items: [
          {
            variantId: mockVariantId,
            batchCode: mockBatchCode,
            quantity: 3,
          },
        ],
      });

      expect(result.success).toBe(true);
      expect(result.status).toBe('PICKED');
      expect(result.pickedAt).toBeDefined();

      expect(prisma.fulfillmentOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockFoId },
          data: expect.objectContaining({
            status: 'PICKED',
          }),
        }),
      );

      expect(prisma.fulfillmentOrderItem.update).toHaveBeenCalledWith({
        where: { id: 'fo-item-1' },
        data: {
          quantityFulfilled: 3,
        },
      });
    });

    it('phải từ chối nếu đơn chưa chuyển sang trạng thái PICKING', async () => {
      prisma.fulfillmentOrder.findUnique.mockResolvedValue({
        ...mockFoWithReservation,
        status: 'ALLOCATED',
      });

      await expect(
        service.completePicking(mockFoId, {
          items: [
            {
              variantId: mockVariantId,
              batchCode: mockBatchCode,
              quantity: 3,
            },
          ],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('phải xử lý idempotent khi đơn đã ở trạng thái PICKED', async () => {
      const pickedDate = new Date();
      prisma.fulfillmentOrder.findUnique.mockResolvedValue({
        ...mockFoWithReservation,
        status: 'PICKED',
        pickedAt: pickedDate,
      });

      const result = await service.completePicking(mockFoId, {
        items: [
          {
            variantId: mockVariantId,
            batchCode: mockBatchCode,
            quantity: 3,
          },
        ],
      });

      expect(result.success).toBe(true);
      expect(result.status).toBe('PICKED');
      expect(prisma.fulfillmentOrder.update).not.toHaveBeenCalled();
    });
  });
});
