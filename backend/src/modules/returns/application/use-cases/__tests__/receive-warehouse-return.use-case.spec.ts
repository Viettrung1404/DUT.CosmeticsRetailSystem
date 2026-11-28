import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { ReceiveWarehouseReturnUseCase } from '../receive-warehouse-return.use-case';
import { PrismaService } from '../../../../../infrastructure/database/prisma.service';
import { OutboxWriterService } from '../../../../async-infrastructure/outbox/outbox-writer.service';
import {
  ReturnOrderStatus,
} from '../../../domain/entities/return-policy.entity';

describe('EP14-T03: ReceiveWarehouseReturnUseCase Unit Tests', () => {
  let useCase: ReceiveWarehouseReturnUseCase;
  let prisma: any;
  let outboxWriter: any;

  const mockReturnOrderId = 'ret-uuid-3333';
  const mockWarehouseId = 'wh-uuid-5555';
  const mockOperatorId = 'user-wh-operator-6666';
  const mockTrackingCode = 'LAD888888';

  const mockReturnOrder = {
    id: mockReturnOrderId,
    returnCode: 'RET-20261117-3003',
    status: 'IN_TRANSIT',
    storeId: mockWarehouseId,
    items: [
      {
        id: 'ret-item-1',
        productVariantId: 'var-sku-1',
        quantity: 3,
      },
    ],
    shipments: [
      {
        id: 'shp-ret-1',
        trackingCode: mockTrackingCode,
        shipmentType: 'RETURN_PICKUP',
        status: 'IN_TRANSIT',
      },
    ],
  };

  beforeEach(async () => {
    prisma = {
      returnOrder: {
        findFirst: jest.fn().mockResolvedValue(mockReturnOrder),
        update: jest.fn(),
      },
      store: {
        findFirst: jest.fn().mockResolvedValue({ id: mockWarehouseId, type: 'WAREHOUSE' }),
      },
      returnReceipt: {
        create: jest.fn(),
      },
      inventory: {
        upsert: jest.fn(),
      },
      inventoryTransaction: {
        create: jest.fn(),
      },
      shipment: {
        update: jest.fn(),
      },
      $transaction: jest.fn(async (callback) => {
        return callback(prisma);
      }),
    };

    outboxWriter = {
      record: jest.fn().mockResolvedValue({ id: 'outbox-uuid-3' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReceiveWarehouseReturnUseCase,
        { provide: PrismaService, useValue: prisma },
        { provide: OutboxWriterService, useValue: outboxWriter },
      ],
    }).compile();

    useCase = module.get<ReceiveWarehouseReturnUseCase>(ReceiveWarehouseReturnUseCase);
  });

  it('1. should throw NotFoundException if ReturnOrder is not found by identifier', async () => {
    prisma.returnOrder.findFirst.mockResolvedValue(null);

    await expect(
      useCase.execute('invalid-barcode-or-id', mockOperatorId),
    ).rejects.toThrow(NotFoundException);
  });

  it('2. should throw ConflictException if ReturnOrder status is not valid for receiving (e.g. COMPLETED)', async () => {
    prisma.returnOrder.findFirst.mockResolvedValue({
      ...mockReturnOrder,
      status: ReturnOrderStatus.COMPLETED,
    });

    await expect(
      useCase.execute(mockReturnOrderId, mockOperatorId),
    ).rejects.toThrow(ConflictException);
  });

  it('3. should successfully receive return package at warehouse with quarantine inventory & Outbox event', async () => {
    const mockReceipt = {
      id: 'rcp-uuid-999',
      receiptCode: 'RCP-WH-20261117-9999',
      returnOrderId: mockReturnOrderId,
      locationId: mockWarehouseId,
      receivedBy: mockOperatorId,
      receivedItemsCount: 3,
      packageConditionNote: 'Bao bì nguyên vẹn',
      createdAt: new Date(),
    };

    prisma.returnReceipt.create.mockResolvedValue(mockReceipt);
    prisma.returnOrder.update.mockResolvedValue({
      ...mockReturnOrder,
      status: ReturnOrderStatus.RECEIVED,
    });

    const result = await useCase.execute(mockReturnOrderId, mockOperatorId, {
      warehouseId: mockWarehouseId,
      packageConditionNote: 'Bao bì nguyên vẹn',
    });

    // 1. ReturnReceipt creation
    expect(prisma.returnReceipt.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          returnOrderId: mockReturnOrderId,
          locationId: mockWarehouseId,
          receivedBy: mockOperatorId,
          receivedItemsCount: 3,
          receiptCode: expect.stringMatching(/^RCP-WH-\d{8}-\d{4}$/),
        }),
      }),
    );

    // 2. Inventory quarantine update (availableQuantity NOT increased)
    expect(prisma.inventory.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          storeId_productVariantId: {
            storeId: mockWarehouseId,
            productVariantId: 'var-sku-1',
          },
        },
        update: {
          quantity: { increment: 3 },
          quarantinedQuantity: { increment: 3 },
        },
      }),
    );

    // 3. Inventory transaction record
    expect(prisma.inventoryTransaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          storeId: mockWarehouseId,
          productVariantId: 'var-sku-1',
          transactionType: 'RETURN_INBOUND',
          quantity: 3,
          referenceType: 'RETURN_RECEIPT',
        }),
      }),
    );

    // 4. Shipment status updated to DELIVERED
    expect(prisma.shipment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'shp-ret-1' },
        data: expect.objectContaining({
          status: 'DELIVERED',
        }),
      }),
    );

    // 5. ReturnOrder status updated to RECEIVED
    expect(prisma.returnOrder.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: mockReturnOrderId },
        data: expect.objectContaining({
          status: ReturnOrderStatus.RECEIVED,
        }),
      }),
    );

    // 6. Outbox event RMA_RECEIVED_AT_WAREHOUSE recorded
    expect(outboxWriter.record).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        aggregateType: 'RETURN_ORDER',
        aggregateId: mockReturnOrderId,
        eventType: 'RMA_RECEIVED_AT_WAREHOUSE',
        payload: expect.objectContaining({
          returnOrderId: mockReturnOrderId,
          receiptCode: mockReceipt.receiptCode,
          warehouseId: mockWarehouseId,
        }),
      }),
    );

    expect(result.receipt).toBeDefined();
    expect(result.returnOrder.status).toBe(ReturnOrderStatus.RECEIVED);
  });

  it('4. should successfully receive return package by carrier trackingCode scan (EP14-T03)', async () => {
    prisma.returnReceipt.create.mockResolvedValue({
      id: 'rcp-uuid-tracking',
      receiptCode: 'RCP-WH-20261117-1234',
      createdAt: new Date(),
    });
    prisma.returnOrder.update.mockResolvedValue({
      ...mockReturnOrder,
      status: ReturnOrderStatus.RECEIVED,
    });

    const result = await useCase.execute(mockTrackingCode, mockOperatorId);

    // Verify lookup was performed with trackingCode in OR
    expect(prisma.returnOrder.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            { shipments: { some: { trackingCode: mockTrackingCode } } },
          ]),
        }),
      }),
    );

    expect(result.receipt).toBeDefined();
  });
});
