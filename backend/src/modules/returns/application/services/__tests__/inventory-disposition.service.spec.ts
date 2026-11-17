import { BadRequestException } from '@nestjs/common';
import { InventoryDispositionService } from '../inventory-disposition.service';
import { ReturnDisposition } from '../../../domain/entities/return-policy.entity';

describe('EP15-T02: InventoryDispositionService Unit Tests', () => {
  let service: InventoryDispositionService;
  let mockTx: any;

  beforeEach(() => {
    service = new InventoryDispositionService();

    mockTx = {
      inventory: {
        update: jest.fn().mockResolvedValue({}),
      },
      inventoryLot: {
        update: jest.fn().mockResolvedValue({}),
      },
      inventoryTransaction: {
        create: jest.fn().mockResolvedValue({ id: 'txn-1' }),
      },
      inventoryDisposition: {
        create: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({
            id: 'disp-uuid-1',
            ...data,
          }),
        ),
      },
    };
  });

  it('1. should execute RESTOCK disposition properly (AC1)', async () => {
    const params = {
      locationId: 'store-1',
      productVariantId: 'var-1',
      lotId: 'lot-1',
      returnItemId: 'item-1',
      disposition: ReturnDisposition.RESTOCK,
      quantity: 2,
      operatorUserId: 'user-kcs-1',
      notes: 'Hàng nguyên vẹn đạt chuẩn KCS',
    };

    const result = await service.executeItemDisposition(mockTx, params);

    expect(result).toBeDefined();
    expect(result.dispositionType).toBe(ReturnDisposition.RESTOCK);
    expect(result.quantity).toBe(2);

    // Verify inventory quarantinedQuantity decremented
    expect(mockTx.inventory.update).toHaveBeenCalledWith({
      where: {
        storeId_productVariantId: {
          storeId: 'store-1',
          productVariantId: 'var-1',
        },
      },
      data: {
        quarantinedQuantity: { decrement: 2 },
      },
    });

    // Verify lot restored
    expect(mockTx.inventoryLot.update).toHaveBeenCalledWith({
      where: { id: 'lot-1' },
      data: {
        quantityOnHand: { increment: 2 },
      },
    });

    // Verify transaction created
    expect(mockTx.inventoryTransaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        storeId: 'store-1',
        productVariantId: 'var-1',
        transactionType: 'RETURN_RESTOCK',
        quantity: 2,
        referenceType: 'INVENTORY_DISPOSITION',
        createdBy: 'user-kcs-1',
      }),
    });

    // Verify disposition record created
    expect(mockTx.inventoryDisposition.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        locationId: 'store-1',
        productVariantId: 'var-1',
        lotId: 'lot-1',
        returnItemId: 'item-1',
        dispositionType: ReturnDisposition.RESTOCK,
        quantity: 2,
      }),
    });
  });

  it('2. should execute SCRAP disposition properly (AC2)', async () => {
    const params = {
      locationId: 'store-1',
      productVariantId: 'var-1',
      returnItemId: 'item-1',
      disposition: ReturnDisposition.SCRAP,
      quantity: 1,
      operatorUserId: 'user-kcs-1',
      notes: 'Hàng rách nát, chai vỡ',
    };

    const result = await service.executeItemDisposition(mockTx, params);

    expect(result).toBeDefined();
    expect(result.dispositionType).toBe(ReturnDisposition.SCRAP);

    // Quarantined decrements, damaged increments
    expect(mockTx.inventory.update).toHaveBeenCalledWith({
      where: {
        storeId_productVariantId: {
          storeId: 'store-1',
          productVariantId: 'var-1',
        },
      },
      data: {
        quarantinedQuantity: { decrement: 1 },
        damagedQuantity: { increment: 1 },
      },
    });

    expect(mockTx.inventoryTransaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        transactionType: 'RETURN_SCRAP',
        quantity: 1,
      }),
    });
  });

  it('3. should execute RETURN_TO_CUSTOMER disposition properly (AC3)', async () => {
    const params = {
      locationId: 'store-1',
      productVariantId: 'var-1',
      returnItemId: 'item-1',
      disposition: ReturnDisposition.RETURN_TO_CUSTOMER,
      quantity: 1,
      operatorUserId: 'user-kcs-1',
      notes: 'Từ chối đổi trả do bóc seal',
    };

    const result = await service.executeItemDisposition(mockTx, params);

    expect(result).toBeDefined();
    expect(result.dispositionType).toBe(ReturnDisposition.RETURN_TO_CUSTOMER);

    // Both quarantined and total quantity decrement as item exits warehouse
    expect(mockTx.inventory.update).toHaveBeenCalledWith({
      where: {
        storeId_productVariantId: {
          storeId: 'store-1',
          productVariantId: 'var-1',
        },
      },
      data: {
        quarantinedQuantity: { decrement: 1 },
        quantity: { decrement: 1 },
      },
    });

    expect(mockTx.inventoryTransaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        transactionType: 'RETURN_REJECTED',
        quantity: 1,
      }),
    });
  });

  it('4. should execute QUARANTINE disposition properly', async () => {
    const params = {
      locationId: 'store-1',
      productVariantId: 'var-1',
      returnItemId: 'item-1',
      disposition: ReturnDisposition.QUARANTINE,
      quantity: 1,
      operatorUserId: 'user-kcs-1',
      notes: 'Chờ hội đồng y tế',
    };

    const result = await service.executeItemDisposition(mockTx, params);

    expect(result).toBeDefined();
    expect(mockTx.inventoryTransaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        transactionType: 'RETURN_QUARANTINE',
        quantity: 1,
      }),
    });
  });

  it('5. should throw BadRequestException if quantity <= 0', async () => {
    const params = {
      locationId: 'store-1',
      productVariantId: 'var-1',
      disposition: ReturnDisposition.RESTOCK,
      quantity: 0,
    };

    await expect(service.executeItemDisposition(mockTx, params)).rejects.toThrow(
      BadRequestException,
    );
  });
});
