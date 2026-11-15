import { Test, TestingModule } from '@nestjs/testing';
import { InventoryBalanceService } from '../inventory-balance.service';
import { AtpCalculatorService } from '../atp-calculator.service';
import { PrismaService } from '@infrastructure/database/prisma.service';

describe('EP01-T03: InventoryBalanceService Unit Tests', () => {
  let service: InventoryBalanceService;
  let prismaMock: {
    inventory: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
    };
  };
  let atpCalculator: AtpCalculatorService;

  beforeEach(async () => {
    prismaMock = {
      inventory: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryBalanceService,
        AtpCalculatorService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<InventoryBalanceService>(InventoryBalanceService);
    atpCalculator = module.get<AtpCalculatorService>(AtpCalculatorService);
  });

  describe('1. getBalance', () => {
    it('phải trả về null nếu không tìm thấy bản ghi tồn kho', async () => {
      prismaMock.inventory.findUnique.mockResolvedValue(null);

      const result = await service.getBalance('store_01', 'var_01');
      expect(result).toBeNull();
      expect(prismaMock.inventory.findUnique).toHaveBeenCalledWith({
        where: {
          storeId_productVariantId: {
            storeId: 'store_01',
            productVariantId: 'var_01',
          },
        },
      });
    });

    it('phải trả về InventoryBalanceDto và tính đúng ATP khi tìm thấy bản ghi', async () => {
      const mockRecord = {
        id: 'inv_01',
        storeId: 'store_01',
        productVariantId: 'var_01',
        quantity: 100,
        reservedQuantity: 20,
        safetyStock: 10,
        quarantinedQuantity: 5,
        damagedQuantity: 5,
        minQuantity: 10,
        updatedAt: new Date('2026-11-15T00:00:00Z'),
      };
      prismaMock.inventory.findUnique.mockResolvedValue(mockRecord);

      const result = await service.getBalance('store_01', 'var_01');

      expect(result).toBeDefined();
      expect(result?.id).toBe('inv_01');
      expect(result?.locationId).toBe('store_01');
      expect(result?.productVariantId).toBe('var_01');
      expect(result?.physicalOnHand).toBe(100);
      expect(result?.reservedQuantity).toBe(20);
      expect(result?.safetyStock).toBe(10);
      expect(result?.quarantinedQuantity).toBe(5);
      expect(result?.damagedQuantity).toBe(5);
      // ATP = 100 - 20 - 10 - 5 - 5 = 60
      expect(result?.availableQuantity).toBe(60);
    });

    it('phải sử dụng TransactionClient nếu được truyền vào', async () => {
      const txMock = {
        inventory: {
          findUnique: jest.fn().mockResolvedValue(null),
        },
      };

      await service.getBalance('store_01', 'var_01', txMock as any);

      expect(txMock.inventory.findUnique).toHaveBeenCalled();
      expect(prismaMock.inventory.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('2. getAtp', () => {
    it('phải trả về ATP khả dụng của variant', async () => {
      prismaMock.inventory.findUnique.mockResolvedValue({
        id: 'inv_02',
        storeId: 'store_02',
        productVariantId: 'var_02',
        quantity: 50,
        reservedQuantity: 10,
        safetyStock: 5,
        quarantinedQuantity: 0,
        damagedQuantity: 0,
        minQuantity: 5,
        updatedAt: new Date(),
      });

      const atp = await service.getAtp('store_02', 'var_02');
      expect(atp).toBe(35); // 50 - 10 - 5 = 35
    });

    it('phải trả về 0 nếu không tìm thấy balance', async () => {
      prismaMock.inventory.findUnique.mockResolvedValue(null);

      const atp = await service.getAtp('store_02', 'var_unknown');
      expect(atp).toBe(0);
    });
  });

  describe('3. getBulkAtp', () => {
    it('phải trả về Map rỗng khi danh sách variantIds rỗng', async () => {
      const result = await service.getBulkAtp('store_01', []);
      expect(result.size).toBe(0);
      expect(prismaMock.inventory.findMany).not.toHaveBeenCalled();
    });

    it('phải gán ATP = 0 cho các variant không có bản ghi trong database', async () => {
      prismaMock.inventory.findMany.mockResolvedValue([
        {
          id: 'inv_01',
          storeId: 'store_01',
          productVariantId: 'var_01',
          quantity: 20,
          reservedQuantity: 5,
          safetyStock: 2,
          quarantinedQuantity: 0,
          damagedQuantity: 0,
        },
      ]);

      const result = await service.getBulkAtp('store_01', ['var_01', 'var_02']);

      expect(result.get('var_01')).toBe(13); // 20 - 5 - 2 = 13
      expect(result.get('var_02')).toBe(0); // Không có trong DB -> 0
    });
  });

  describe('4. checkAvailability', () => {
    it('phải trả về isAvailable = true khi tất cả items đều đủ ATP', async () => {
      prismaMock.inventory.findMany.mockResolvedValue([
        {
          productVariantId: 'var_01',
          quantity: 20,
          reservedQuantity: 0,
          safetyStock: 0,
          quarantinedQuantity: 0,
          damagedQuantity: 0,
        },
        {
          productVariantId: 'var_02',
          quantity: 15,
          reservedQuantity: 5,
          safetyStock: 0,
          quarantinedQuantity: 0,
          damagedQuantity: 0,
        },
      ]);

      const result = await service.checkAvailability('store_01', [
        { variantId: 'var_01', quantity: 10 },
        { variantId: 'var_02', quantity: 10 }, // 15 - 5 = 10 -> đủ
      ]);

      expect(result.isAvailable).toBe(true);
      expect(result.shortfalls).toHaveLength(0);
    });

    it('phải trả về isAvailable = false và danh sách shortfalls khi có item thiếu tồn', async () => {
      prismaMock.inventory.findMany.mockResolvedValue([
        {
          productVariantId: 'var_01',
          quantity: 5,
          reservedQuantity: 2,
          safetyStock: 1, // ATP = 2
          quarantinedQuantity: 0,
          damagedQuantity: 0,
        },
      ]);

      const result = await service.checkAvailability('store_01', [
        { variantId: 'var_01', quantity: 5 }, // Cần 5, có 2 -> thiếu 3
        { variantId: 'var_missing', quantity: 2 }, // Cần 2, có 0 -> thiếu 2
      ]);

      expect(result.isAvailable).toBe(false);
      expect(result.shortfalls).toEqual([
        { variantId: 'var_01', required: 5, available: 2 },
        { variantId: 'var_missing', required: 2, available: 0 },
      ]);
    });
  });
});
