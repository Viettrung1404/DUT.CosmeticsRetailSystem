import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { ReceiveStoreDropoffUseCase } from '../receive-store-dropoff.use-case';
import { PrismaService } from '../../../../../infrastructure/database/prisma.service';
import { OutboxWriterService } from '../../../../async-infrastructure/outbox/outbox-writer.service';
import {
  ReturnChannel,
  ReturnOrderStatus,
} from '../../../domain/entities/return-policy.entity';

describe('EP14-T01: ReceiveStoreDropoffUseCase Unit Tests', () => {
  let useCase: ReceiveStoreDropoffUseCase;
  let prisma: any;
  let outboxWriter: any;

  const mockReturnOrderId = 'ret-uuid-1111';
  const mockUserId = 'user-staff-2222';
  const mockStoreId = 'store-q1-3333';
  const mockVariantId1 = 'var-uuid-4441';

  const mockReturnOrder = {
    id: mockReturnOrderId,
    returnCode: 'RET-20261117-1001',
    returnChannel: ReturnChannel.STORE_DROPOFF,
    status: ReturnOrderStatus.SUBMITTED,
    storeId: mockStoreId,
    dropoffLocationId: mockStoreId,
    items: [
      {
        id: 'ret-item-1',
        productVariantId: mockVariantId1,
        quantity: 2,
      },
    ],
  };

  beforeEach(async () => {
    prisma = {
      returnOrder: {
        findUnique: jest.fn().mockResolvedValue(mockReturnOrder),
        update: jest.fn(),
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
      $transaction: jest.fn(async (callback) => {
        return callback(prisma);
      }),
    };

    outboxWriter = {
      record: jest.fn().mockResolvedValue({ id: 'outbox-uuid-1' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReceiveStoreDropoffUseCase,
        { provide: PrismaService, useValue: prisma },
        { provide: OutboxWriterService, useValue: outboxWriter },
      ],
    }).compile();

    useCase = module.get<ReceiveStoreDropoffUseCase>(ReceiveStoreDropoffUseCase);
  });

  it('1. should throw NotFoundException when ReturnOrder does not exist', async () => {
    prisma.returnOrder.findUnique.mockResolvedValue(null);

    await expect(
      useCase.execute('non-existent-id', mockUserId),
    ).rejects.toThrow(NotFoundException);
  });

  it('2. should throw BadRequestException when return channel is not STORE_DROPOFF', async () => {
    prisma.returnOrder.findUnique.mockResolvedValue({
      ...mockReturnOrder,
      returnChannel: ReturnChannel.CARRIER_PICKUP,
    });

    await expect(
      useCase.execute(mockReturnOrderId, mockUserId),
    ).rejects.toThrow(BadRequestException);
  });

  it('3. should throw ConflictException when return order status is already RECEIVED or COMPLETED (AC1)', async () => {
    prisma.returnOrder.findUnique.mockResolvedValue({
      ...mockReturnOrder,
      status: ReturnOrderStatus.RECEIVED,
    });

    await expect(
      useCase.execute(mockReturnOrderId, mockUserId),
    ).rejects.toThrow(ConflictException);
  });

  it('4. should successfully receive return at store: create ReturnReceipt, update quarantined inventory, and record Outbox event', async () => {
    const mockReceipt = {
      id: 'receipt-uuid-999',
      receiptCode: 'RCP-20261117-9999',
      returnOrderId: mockReturnOrderId,
      locationId: mockStoreId,
      receivedBy: mockUserId,
      receivedItemsCount: 2,
      packageConditionNote: 'Nguyên vẹn',
      createdAt: new Date(),
    };

    const mockUpdatedReturn = {
      ...mockReturnOrder,
      status: ReturnOrderStatus.RECEIVED,
      handledBy: mockUserId,
      receipts: [mockReceipt],
    };

    prisma.returnReceipt.create.mockResolvedValue(mockReceipt);
    prisma.returnOrder.update.mockResolvedValue(mockUpdatedReturn);

    const result = await useCase.execute(mockReturnOrderId, mockUserId, {
      packageConditionNote: 'Nguyên vẹn',
    });

    expect(result).toBeDefined();
    expect(result.receipt.id).toBe('receipt-uuid-999');
    expect(result.returnOrder.status).toBe(ReturnOrderStatus.RECEIVED);

    // Verify ReturnReceipt created with locationId
    expect(prisma.returnReceipt.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          returnOrderId: mockReturnOrderId,
          locationId: mockStoreId,
          receivedBy: mockUserId,
          receivedItemsCount: 2,
        }),
      }),
    );

    // Verify Inventory updated into quarantinedQuantity (AC2 & AC3)
    expect(prisma.inventory.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          storeId_productVariantId: {
            storeId: mockStoreId,
            productVariantId: mockVariantId1,
          },
        },
        update: {
          quantity: { increment: 2 },
          quarantinedQuantity: { increment: 2 },
        },
      }),
    );

    // Verify InventoryTransaction created
    expect(prisma.inventoryTransaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          storeId: mockStoreId,
          productVariantId: mockVariantId1,
          transactionType: 'RETURN_INBOUND',
          quantity: 2,
        }),
      }),
    );

    // Verify Outbox Event recorded (AC4)
    expect(outboxWriter.record).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        aggregateType: 'RETURN_ORDER',
        aggregateId: mockReturnOrderId,
        eventType: 'RMA_RECEIVED_AT_STORE',
        payload: expect.objectContaining({
          receiptId: 'receipt-uuid-999',
          returnOrderId: mockReturnOrderId,
          locationId: mockStoreId,
        }),
      }),
    );
  });
});
