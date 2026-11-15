import { PrismaClient, Prisma } from '@prisma/client';

describe('EP01-T01: Locations & Inventory Balances Schema & Integrity Constraints', () => {
  let prisma: PrismaClient;
  let testStoreId: string;
  let testVariantId: string;

  beforeAll(async () => {
    prisma = new PrismaClient();

    // Lấy 1 store và 1 variant có sẵn trong hệ thống để test
    const store = await prisma.store.findFirst({
      where: { code: 'WH-TB' },
      select: { id: true },
    });
    if (!store) {
      throw new Error('Không tìm thấy store WH-TB từ seed data!');
    }
    testStoreId = store.id;

    const variant = await prisma.productVariant.findFirst({
      where: { isActive: true },
      select: { id: true },
    });
    if (!variant) {
      throw new Error('Không tìm thấy product variant trong database!');
    }
    testVariantId = variant.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('1. Location & Store Schema Attributes', () => {
    it('phải lưu trữ đúng fulfillmentCapacityPerDay cho Central Warehouse và Showroom', async () => {
      const warehouse = await prisma.store.findUnique({
        where: { code: 'WH-TB' },
      });
      expect(warehouse).toBeDefined();
      expect(warehouse?.type).toBe('WAREHOUSE');
      expect(warehouse?.fulfillmentCapacityPerDay).toBe(2500);
      expect(Number(warehouse?.latitude)).toBeCloseTo(10.8142, 3);
      expect(Number(warehouse?.longitude)).toBeCloseTo(106.6264, 3);

      const showroomQ1 = await prisma.store.findUnique({
        where: { code: 'STORE-03' },
      });
      expect(showroomQ1).toBeDefined();
      expect(showroomQ1?.type).toBe('STORE');
      expect(showroomQ1?.fulfillmentCapacityPerDay).toBe(500);

      const showroomQ10 = await prisma.store.findUnique({
        where: { code: 'STORE-06' },
      });
      expect(showroomQ10).toBeDefined();
      expect(showroomQ10?.fulfillmentCapacityPerDay).toBe(500);

      const showroomBT = await prisma.store.findUnique({
        where: { code: 'STORE-07' },
      });
      expect(showroomBT).toBeDefined();
      expect(showroomBT?.fulfillmentCapacityPerDay).toBe(500);
    });
  });

  describe('2. Inventory Balances Logical Constraints (PostgreSQL Check Constraints)', () => {
    it('phải cho phép cập nhật số dư hợp lệ và tự động tính đúng available_quantity (ATP)', async () => {
      // Thiết lập: quantity = 100, reserved = 20, safety = 10, quarantined = 5, damaged = 5
      // Tổng giữ chỗ + bảo vệ = 40 <= 100.
      // ATP khả dụng = 100 - 40 = 60.
      const updated = await prisma.inventory.upsert({
        where: {
          storeId_productVariantId: {
            storeId: testStoreId,
            productVariantId: testVariantId,
          },
        },
        update: {
          quantity: 100,
          reservedQuantity: 20,
          safetyStock: 10,
          quarantinedQuantity: 5,
          damagedQuantity: 5,
        },
        create: {
          storeId: testStoreId,
          productVariantId: testVariantId,
          quantity: 100,
          reservedQuantity: 20,
          safetyStock: 10,
          quarantinedQuantity: 5,
          damagedQuantity: 5,
        },
      });

      expect(updated.quantity).toBe(100);
      expect(updated.reservedQuantity).toBe(20);
      expect(updated.safetyStock).toBe(10);
      expect(updated.quarantinedQuantity).toBe(5);
      expect(updated.damagedQuantity).toBe(5);
      expect(updated.availableQuantity).toBe(60);
    });

    it('phải CHẶN khi tổng (reserved + safety + quarantined + damaged) > quantity (chk_inventory_balances_logical)', async () => {
      // quantity = 50, nhưng reserved = 30, safety = 15, quarantined = 10 (tổng = 55 > 50)
      let errorThrown: any = null;

      try {
        await prisma.$executeRaw(
          Prisma.sql`
            UPDATE "inventory"
            SET "quantity" = 50,
                "reserved_quantity" = 30,
                "safety_stock" = 15,
                "quarantined_quantity" = 10,
                "damaged_quantity" = 0
            WHERE "store_id" = ${testStoreId}::uuid
              AND "product_variant_id" = ${testVariantId}::uuid;
          `,
        );
      } catch (error) {
        errorThrown = error;
      }

      expect(errorThrown).toBeDefined();
      // Mã lỗi PostgreSQL 23514: check_violation
      expect(errorThrown?.message || errorThrown?.code).toMatch(/23514|chk_inventory_balances_logical/i);
    });

    it('phải CHẶN khi safety_stock bị cập nhật số âm (chk_inventory_safety_non_negative)', async () => {
      let errorThrown: any = null;

      try {
        await prisma.$executeRaw(
          Prisma.sql`
            UPDATE "inventory"
            SET "safety_stock" = -5
            WHERE "store_id" = ${testStoreId}::uuid
              AND "product_variant_id" = ${testVariantId}::uuid;
          `,
        );
      } catch (error) {
        errorThrown = error;
      }

      expect(errorThrown).toBeDefined();
      expect(errorThrown?.message || errorThrown?.code).toMatch(/23514|chk_inventory_safety_non_negative/i);
    });

    it('phải CHẶN khi quarantined_quantity hoặc damaged_quantity bị cập nhật số âm', async () => {
      let errorThrown: any = null;

      try {
        await prisma.$executeRaw(
          Prisma.sql`
            UPDATE "inventory"
            SET "quarantined_quantity" = -1
            WHERE "store_id" = ${testStoreId}::uuid
              AND "product_variant_id" = ${testVariantId}::uuid;
          `,
        );
      } catch (error) {
        errorThrown = error;
      }

      expect(errorThrown).toBeDefined();
      expect(errorThrown?.message || errorThrown?.code).toMatch(/23514|chk_inventory_quarantined_non_negative/i);
    });
  });

  describe('3. Standardized Seed Data Verification', () => {
    it('phải có ít nhất 4 locations trọng yếu và tồn kho tương ứng cho fulfillment', async () => {
      const targetCodes = ['WH-TB', 'STORE-03', 'STORE-06', 'STORE-07'];

      const stores = await prisma.store.findMany({
        where: { code: { in: targetCodes } },
        include: {
          _count: {
            select: { inventory: true },
          },
        },
      });

      expect(stores.length).toBe(4);

      for (const code of targetCodes) {
        const found = stores.find((s) => s.code === code);
        expect(found).toBeDefined();
        expect(found?.isActive).toBe(true);
        expect(found?._count.inventory).toBeGreaterThan(0);
      }
    });
  });
});
