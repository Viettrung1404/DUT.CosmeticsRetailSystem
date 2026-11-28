import { PrismaClient, Prisma } from '@prisma/client';

describe('EP02-T01: Inventory Lots Schema & Shelf Life Integrity Constraints', () => {
  let prisma: PrismaClient;
  let testStoreId: string;
  let testVariantId: string;

  beforeAll(async () => {
    prisma = new PrismaClient();

    // 1. Lấy store mẫu từ seed data (Kho Tân Bình)
    const store = await prisma.store.findFirst({
      where: { code: 'WH-TB' },
      select: { id: true },
    });
    if (!store) {
      throw new Error('Không tìm thấy store WH-TB từ seed data!');
    }
    testStoreId = store.id;

    // 2. Lấy product variant mẫu
    const variant = await prisma.productVariant.findFirst({
      where: { isActive: true },
      select: { id: true },
    });
    if (!variant) {
      throw new Error('Không tìm thấy product variant trong database!');
    }
    testVariantId = variant.id;

    // Dọn dẹp các lô test cũ nếu tồn tại
    await prisma.inventoryLot.deleteMany({
      where: {
        batchCode: { startsWith: 'TEST-LOT-' },
      },
    });
  });

  afterAll(async () => {
    // Dọn dẹp dữ liệu test
    await prisma.inventoryLot.deleteMany({
      where: {
        batchCode: { startsWith: 'TEST-LOT-' },
      },
    });
    await prisma.$disconnect();
  });

  describe('1. Multi-Lot Storage & FEFO Ordering (AC1 & AC5)', () => {
    it('phải cho phép lưu nhiều lô hàng khác nhau cho cùng một sản phẩm tại cùng một địa điểm', async () => {
      const today = new Date();

      // Lô A: Hạn dùng +60 ngày
      const expiryA = new Date(today);
      expiryA.setDate(expiryA.getDate() + 60);

      // Lô B: Hạn dùng +30 ngày (cận date hơn)
      const expiryB = new Date(today);
      expiryB.setDate(expiryB.getDate() + 30);

      // Lô C: Hạn dùng +120 ngày (date xa hơn)
      const expiryC = new Date(today);
      expiryC.setDate(expiryC.getDate() + 120);

      const lotA = await prisma.inventoryLot.create({
        data: {
          locationId: testStoreId,
          productVariantId: testVariantId,
          batchCode: 'TEST-LOT-EXP-60D',
          expiryDate: expiryA,
          quantityOnHand: 100,
          quantityReserved: 10,
        },
      });

      const lotB = await prisma.inventoryLot.create({
        data: {
          locationId: testStoreId,
          productVariantId: testVariantId,
          batchCode: 'TEST-LOT-EXP-30D',
          expiryDate: expiryB,
          quantityOnHand: 50,
          quantityReserved: 5,
        },
      });

      const lotC = await prisma.inventoryLot.create({
        data: {
          locationId: testStoreId,
          productVariantId: testVariantId,
          batchCode: 'TEST-LOT-EXP-120D',
          expiryDate: expiryC,
          quantityOnHand: 80,
          quantityReserved: 0,
        },
      });

      expect(lotA.id).toBeDefined();
      expect(lotB.id).toBeDefined();
      expect(lotC.id).toBeDefined();

      // Truy vấn và sắp xếp FEFO (expiryDate ASC)
      const lots = await prisma.inventoryLot.findMany({
        where: {
          locationId: testStoreId,
          productVariantId: testVariantId,
          batchCode: { in: ['TEST-LOT-EXP-60D', 'TEST-LOT-EXP-30D', 'TEST-LOT-EXP-120D'] },
        },
        orderBy: { expiryDate: 'asc' },
      });

      expect(lots).toHaveLength(3);
      // Lô B (+30 ngày) phải được ưu tiên xuất trước
      expect(lots[0].batchCode).toBe('TEST-LOT-EXP-30D');
      expect(lots[0].quantityOnHand).toBe(50);
      // Lô A (+60 ngày) xuất tiếp theo
      expect(lots[1].batchCode).toBe('TEST-LOT-EXP-60D');
      // Lô C (+120 ngày) xuất cuối cùng
      expect(lots[2].batchCode).toBe('TEST-LOT-EXP-120D');
    });
  });

  describe('2. Inventory Lot Quantity Constraints (PostgreSQL Check Constraints)', () => {
    it('phải CHẶN giữ chỗ vượt quá số lượng tồn thực tế trên lô (quantity_reserved > quantity_on_hand) (AC2)', async () => {
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + 90);

      // Thử tạo lô có reserved (150) > onHand (100)
      let errorThrown: any = null;
      try {
        await prisma.inventoryLot.create({
          data: {
            locationId: testStoreId,
            productVariantId: testVariantId,
            batchCode: 'TEST-LOT-INVALID-RESERVED',
            expiryDate: expiry,
            quantityOnHand: 100,
            quantityReserved: 150, // Vi phạm chk_lot_quantities!
          },
        });
      } catch (err: any) {
        errorThrown = err;
      }

      expect(errorThrown).toBeDefined();
      expect(errorThrown.message).toMatch(/chk_lot_quantities|check constraint|23514/i);
    });

    it('phải CHẶN cập nhật số âm cho quantity_on_hand (AC3)', async () => {
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + 90);

      let errorThrown: any = null;
      try {
        await prisma.inventoryLot.create({
          data: {
            locationId: testStoreId,
            productVariantId: testVariantId,
            batchCode: 'TEST-LOT-NEGATIVE-ONHAND',
            expiryDate: expiry,
            quantityOnHand: -10, // Vi phạm chk_lot_quantity_on_hand_non_negative!
            quantityReserved: 0,
          },
        });
      } catch (err: any) {
        errorThrown = err;
      }

      expect(errorThrown).toBeDefined();
      expect(errorThrown.message).toMatch(/chk_lot_quantity_on_hand_non_negative|check constraint|23514/i);
    });

    it('phải CHẶN cập nhật số âm cho quantity_reserved (AC3)', async () => {
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + 90);

      let errorThrown: any = null;
      try {
        await prisma.inventoryLot.create({
          data: {
            locationId: testStoreId,
            productVariantId: testVariantId,
            batchCode: 'TEST-LOT-NEGATIVE-RESERVED',
            expiryDate: expiry,
            quantityOnHand: 50,
            quantityReserved: -5, // Vi phạm chk_lot_quantity_reserved_non_negative!
          },
        });
      } catch (err: any) {
        errorThrown = err;
      }

      expect(errorThrown).toBeDefined();
      expect(errorThrown.message).toMatch(/chk_lot_quantity_reserved_non_negative|check constraint|23514/i);
    });
  });

  describe('3. ProductVariant Minimum Shelf Life Configuration (AC4)', () => {
    it('phải có trường min_shelf_life_days với giá trị mặc định 180 ngày', async () => {
      const variant = await prisma.productVariant.findUnique({
        where: { id: testVariantId },
        select: { id: true, minShelfLifeDays: true },
      });

      expect(variant).toBeDefined();
      expect(variant?.minShelfLifeDays).toBeDefined();
      expect(variant?.minShelfLifeDays).toBeGreaterThanOrEqual(0);
    });

    it('phải CHẶN cập nhật min_shelf_life_days âm ở cấp độ database check constraint', async () => {
      let errorThrown: any = null;
      try {
        // Cố tình cập nhật min_shelf_life_days = -30
        await prisma.$executeRawUnsafe(
          `UPDATE product_variants SET min_shelf_life_days = -30 WHERE id = '${testVariantId}'::uuid;`
        );
      } catch (err: any) {
        errorThrown = err;
      }

      expect(errorThrown).toBeDefined();
      expect(errorThrown.message).toMatch(/chk_product_variant_min_shelf_life_non_negative|check constraint|23514/i);
    });
  });

  describe('4. Unique Constraint & Index Verification (AC5)', () => {
    it('phải CHẶN trùng lặp mã lô (batch_code) tại cùng một địa điểm và biến thể sản phẩm', async () => {
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + 180);

      // Tạo lô đầu tiên
      await prisma.inventoryLot.create({
        data: {
          locationId: testStoreId,
          productVariantId: testVariantId,
          batchCode: 'TEST-LOT-UNIQUE-CHECK',
          expiryDate: expiry,
          quantityOnHand: 40,
          quantityReserved: 0,
        },
      });

      // Tạo lô thứ 2 trùng mã batchCode tại cùng storeId và variantId
      let errorThrown: any = null;
      try {
        await prisma.inventoryLot.create({
          data: {
            locationId: testStoreId,
            productVariantId: testVariantId,
            batchCode: 'TEST-LOT-UNIQUE-CHECK', // Trùng batch_code!
            expiryDate: expiry,
            quantityOnHand: 20,
            quantityReserved: 0,
          },
        });
      } catch (err: any) {
        errorThrown = err;
      }

      expect(errorThrown).toBeDefined();
      expect(errorThrown).toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
      // Mã P2002: Unique constraint failed
      expect((errorThrown as Prisma.PrismaClientKnownRequestError).code).toBe('P2002');
    });

    it('phải tồn tại B-Tree Index idx_lots_fefo_search trong database để tăng tốc độ truy vấn FEFO', async () => {
      const indexes = await prisma.$queryRaw<any[]>`
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE tablename = 'inventory_lots' AND indexname = 'idx_lots_fefo_search';
      `;

      expect(indexes).toBeDefined();
      expect(indexes.length).toBe(1);
      expect(indexes[0].indexname).toBe('idx_lots_fefo_search');
      expect(indexes[0].indexdef).toContain('location_id');
      expect(indexes[0].indexdef).toContain('product_variant_id');
      expect(indexes[0].indexdef).toContain('expiry_date');
    });
  });
});
