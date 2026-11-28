import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { FefoAllocationService } from '../fefo-allocation.service';

describe('EP02-T02: FefoAllocationService Integration Tests', () => {
  let service: FefoAllocationService;
  let prisma: PrismaClient;
  let testStoreId: string;
  let testVariantAId: string;
  let testVariantBId: string;

  beforeAll(async () => {
    prisma = new PrismaClient();

    // 1. Tạo hoặc lấy một Store test riêng biệt để cô lập 100% dữ liệu lô hàng
    const testStore = await prisma.store.upsert({
      where: { code: 'TEST-FEFO-STORE' },
      update: {},
      create: {
        code: 'TEST-FEFO-STORE',
        name: 'Kho Kiểm Thử FEFO',
        type: 'WAREHOUSE',
        address: '123 Đường Test FEFO',
        city: 'Hồ Chí Minh',
        district: 'Quận 1',
        fulfillmentCapacityPerDay: 1000,
      },
    });
    testStoreId = testStore.id;

    // 2. Lấy 2 product variants mẫu
    const variants = await prisma.productVariant.findMany({
      where: { isActive: true },
      take: 2,
      select: { id: true },
    });
    if (variants.length < 2) throw new Error('Cần ít nhất 2 product variants để test!');
    testVariantAId = variants[0].id;
    testVariantBId = variants[1].id;

    // Đảm bảo min_shelf_life_days của variant A là 180 ngày
    await prisma.productVariant.update({
      where: { id: testVariantAId },
      data: { minShelfLifeDays: 180 },
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FefoAllocationService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<FefoAllocationService>(FefoAllocationService);
  });

  beforeEach(async () => {
    // Dọn dẹp dữ liệu test lots tại store kiểm thử trước mỗi bài test để bảo đảm tính cô lập tuyệt đối
    await prisma.inventoryLot.deleteMany({
      where: { locationId: testStoreId },
    });
  });

  afterAll(async () => {
    await prisma.inventoryLot.deleteMany({
      where: { locationId: testStoreId },
    });
    await prisma.store.deleteMany({
      where: { code: 'TEST-FEFO-STORE' },
    });
    await prisma.$disconnect();
  });

  describe('Kịch Bản 1: FEFO Order Priority (AC1)', () => {
    it('phải luôn ưu tiên trừ hết số lượng của lô có hạn sử dụng gần hơn trước', async () => {
      const now = new Date();
      // Lô 1: HSD +200 ngày (hạn gần hơn, thỏa mãn >= 180 ngày), số lượng 10
      const exp1 = new Date(now.getTime() + 200 * 86_400_000);
      // Lô 2: HSD +365 ngày (hạn xa hơn), số lượng 20
      const exp2 = new Date(now.getTime() + 365 * 86_400_000);

      const lot1 = await prisma.inventoryLot.create({
        data: {
          locationId: testStoreId,
          productVariantId: testVariantAId,
          batchCode: 'FEFO-TEST-LOT-NEAR',
          expiryDate: exp1,
          quantityOnHand: 10,
          quantityReserved: 0,
        },
      });

      const lot2 = await prisma.inventoryLot.create({
        data: {
          locationId: testStoreId,
          productVariantId: testVariantAId,
          batchCode: 'FEFO-TEST-LOT-FAR',
          expiryDate: exp2,
          quantityOnHand: 20,
          quantityReserved: 0,
        },
      });

      // Yêu cầu xuất 15 sản phẩm bên trong transaction
      const allocations = await prisma.$transaction(async (tx) => {
        return service.allocateAndLockLots(
          tx,
          testStoreId,
          [{ variantId: testVariantAId, quantity: 15 }],
          { now },
        );
      });

      // Kiểm tra kết quả phân bổ
      expect(allocations).toHaveLength(2);

      // Phân bổ 1: Lấy toàn bộ 10 từ Lô 1 (hạn gần)
      expect(allocations[0].lotId).toBe(lot1.id);
      expect(allocations[0].batchCode).toBe('FEFO-TEST-LOT-NEAR');
      expect(allocations[0].quantity).toBe(10);

      // Phân bổ 2: Lấy 5 còn lại từ Lô 2 (hạn xa)
      expect(allocations[1].lotId).toBe(lot2.id);
      expect(allocations[1].batchCode).toBe('FEFO-TEST-LOT-FAR');
      expect(allocations[1].quantity).toBe(5);

      // Kiểm tra số dư cập nhật trong database
      const updatedLot1 = await prisma.inventoryLot.findUnique({ where: { id: lot1.id } });
      const updatedLot2 = await prisma.inventoryLot.findUnique({ where: { id: lot2.id } });

      expect(updatedLot1?.quantityReserved).toBe(10);
      expect(updatedLot2?.quantityReserved).toBe(5);
    });
  });

  describe('Kịch Bản 2: Near Expiry Exclusion (AC2)', () => {
    it('phải BỎ QUA TUYỆT ĐỐI các lô hàng có hạn sử dụng dưới ngưỡng tối thiểu (min_shelf_life_days)', async () => {
      const now = new Date();
      // Ngưỡng min_shelf_life_days là 180 ngày
      // Lô Cận Date: HSD +90 ngày (cận date dưới 180 ngày), tồn 50
      const expNear = new Date(now.getTime() + 90 * 86_400_000);
      // Lô Đạt Chuẩn: HSD +240 ngày (trên 180 ngày), tồn 30
      const expValid = new Date(now.getTime() + 240 * 86_400_000);

      const nearLot = await prisma.inventoryLot.create({
        data: {
          locationId: testStoreId,
          productVariantId: testVariantAId,
          batchCode: 'FEFO-TEST-EXPIRED-SOON',
          expiryDate: expNear,
          quantityOnHand: 50,
          quantityReserved: 0,
        },
      });

      const validLot = await prisma.inventoryLot.create({
        data: {
          locationId: testStoreId,
          productVariantId: testVariantAId,
          batchCode: 'FEFO-TEST-VALID-SHELF',
          expiryDate: expValid,
          quantityOnHand: 30,
          quantityReserved: 0,
        },
      });

      // Đặt 20 sản phẩm thông thường (không phải clearance)
      const allocations = await prisma.$transaction(async (tx) => {
        return service.allocateAndLockLots(
          tx,
          testStoreId,
          [{ variantId: testVariantAId, quantity: 20 }],
          { now },
        );
      });

      // Chỉ lấy từ validLot, bỏ qua hoàn toàn nearLot
      expect(allocations).toHaveLength(1);
      expect(allocations[0].lotId).toBe(validLot.id);
      expect(allocations[0].quantity).toBe(20);

      // nearLot vẫn còn nguyên 0 reserved
      const checkNearLot = await prisma.inventoryLot.findUnique({ where: { id: nearLot.id } });
      expect(checkNearLot?.quantityReserved).toBe(0);
    });
  });

  describe('Kịch Bản 3: Clearance Flag Allows Near Expiry (AC2)', () => {
    it('phải CHO PHÉP xuất lô cận date khi có cờ isClearance = true miễn là chưa hết hạn', async () => {
      const now = new Date();
      // Lô cận date: HSD +60 ngày (< 180 ngày)
      const expNear = new Date(now.getTime() + 60 * 86_400_000);

      const nearLot = await prisma.inventoryLot.create({
        data: {
          locationId: testStoreId,
          productVariantId: testVariantAId,
          batchCode: 'FEFO-TEST-CLEARANCE-ITEM',
          expiryDate: expNear,
          quantityOnHand: 15,
          quantityReserved: 0,
        },
      });

      // Đặt hàng với cờ isClearance = true
      const allocations = await prisma.$transaction(async (tx) => {
        return service.allocateAndLockLots(
          tx,
          testStoreId,
          [{ variantId: testVariantAId, quantity: 10, isClearance: true }],
          { now },
        );
      });

      expect(allocations).toHaveLength(1);
      expect(allocations[0].lotId).toBe(nearLot.id);
      expect(allocations[0].quantity).toBe(10);

      const updatedNearLot = await prisma.inventoryLot.findUnique({ where: { id: nearLot.id } });
      expect(updatedNearLot?.quantityReserved).toBe(10);
    });
  });

  describe('Kịch Bản 4: Lot Shortage Exception (AC3)', () => {
    it('phải ném ConflictException(LOT_SHORTAGE) và rollback toàn bộ transaction khi không đủ hàng đạt chuẩn', async () => {
      const now = new Date();
      const exp = new Date(now.getTime() + 250 * 86_400_000);

      const lot = await prisma.inventoryLot.create({
        data: {
          locationId: testStoreId,
          productVariantId: testVariantAId,
          batchCode: 'FEFO-TEST-INSUFFICIENT',
          expiryDate: exp,
          quantityOnHand: 10, // Chỉ có 10 tại store này
          quantityReserved: 0,
        },
      });

      // Thử đặt 25 sản phẩm (thiếu 15)
      let errorThrown: any = null;
      try {
        await prisma.$transaction(async (tx) => {
          return service.allocateAndLockLots(
            tx,
            testStoreId,
            [{ variantId: testVariantAId, quantity: 25 }],
            { now },
          );
        });
      } catch (err: any) {
        errorThrown = err;
      }

      expect(errorThrown).toBeDefined();
      expect(errorThrown).toBeInstanceOf(ConflictException);
      expect(errorThrown.message).toContain('LOT_SHORTAGE');

      // Do transaction bị rollback, quantityReserved của lot vẫn phải là 0
      const checkLot = await prisma.inventoryLot.findUnique({ where: { id: lot.id } });
      expect(checkLot?.quantityReserved).toBe(0);
    });
  });

  describe('Kịch Bản 5: Release Locked Lots, Multi-item Ordering & Simulation', () => {
    it('phải giải phóng số lượng giữ chỗ thành công khi gọi releaseLockedLots', async () => {
      const now = new Date();
      const exp = new Date(now.getTime() + 300 * 86_400_000);

      const lot = await prisma.inventoryLot.create({
        data: {
          locationId: testStoreId,
          productVariantId: testVariantAId,
          batchCode: 'FEFO-TEST-RELEASE-LOT',
          expiryDate: exp,
          quantityOnHand: 50,
          quantityReserved: 20, // Đang giữ chỗ 20
        },
      });

      // Giải phóng 15
      await prisma.$transaction(async (tx) => {
        await service.releaseLockedLots(tx, [{ lotId: lot.id, quantity: 15 }]);
      });

      const updated = await prisma.inventoryLot.findUnique({ where: { id: lot.id } });
      expect(updated?.quantityReserved).toBe(5); // 20 - 15 = 5
    });

    it('phải mô phỏng phân bổ chính xác ở chế độ read-only (simulateAllocation)', async () => {
      const now = new Date();
      const exp = new Date(now.getTime() + 300 * 86_400_000);

      await prisma.inventoryLot.create({
        data: {
          locationId: testStoreId,
          productVariantId: testVariantAId,
          batchCode: 'FEFO-TEST-SIMULATE',
          expiryDate: exp,
          quantityOnHand: 15,
          quantityReserved: 5, // khả dụng = 10
        },
      });

      // 1. Mô phỏng đủ hàng (cần 8 <= 10)
      const simSuccess = await service.simulateAllocation(
        testStoreId,
        [{ variantId: testVariantAId, quantity: 8 }],
        { now },
      );
      expect(simSuccess.canFulfill).toBe(true);
      expect(simSuccess.allocations).toHaveLength(1);
      expect(simSuccess.allocations[0].quantity).toBe(8);
      expect(simSuccess.shortfalls).toHaveLength(0);

      // 2. Mô phỏng thiếu hàng (cần 20 > 10)
      const simFail = await service.simulateAllocation(
        testStoreId,
        [{ variantId: testVariantAId, quantity: 20 }],
        { now },
      );
      expect(simFail.canFulfill).toBe(false);
      expect(simFail.shortfalls).toHaveLength(1);
      expect(simFail.shortfalls[0].missingQuantity).toBe(10);
    });

    it('phải ném NotFoundException nếu variant không tồn tại', async () => {
      const fakeVariantId = '00000000-0000-0000-0000-000000000000';
      await expect(
        prisma.$transaction(async (tx) => {
          return service.allocateAndLockLots(
            tx,
            testStoreId,
            [{ variantId: fakeVariantId, quantity: 5 }],
          );
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('phải sắp xếp các items theo variantId để bảo đảm thứ tự khóa tài nguyên nhất quán (Deadlock Prevention)', async () => {
      const now = new Date();
      const exp = new Date(now.getTime() + 300 * 86_400_000);

      // Tạo lô cho variant A và variant B
      await prisma.inventoryLot.create({
        data: {
          locationId: testStoreId,
          productVariantId: testVariantAId,
          batchCode: 'FEFO-TEST-DEADLOCK-A',
          expiryDate: exp,
          quantityOnHand: 10,
          quantityReserved: 0,
        },
      });

      await prisma.inventoryLot.create({
        data: {
          locationId: testStoreId,
          productVariantId: testVariantBId,
          batchCode: 'FEFO-TEST-DEADLOCK-B',
          expiryDate: exp,
          quantityOnHand: 10,
          quantityReserved: 0,
        },
      });

      // Truyền mảng items theo thứ tự ngược (B trước, A sau)
      const allocations = await prisma.$transaction(async (tx) => {
        return service.allocateAndLockLots(
          tx,
          testStoreId,
          [
            { variantId: testVariantBId, quantity: 5 },
            { variantId: testVariantAId, quantity: 5 },
          ],
          { now },
        );
      });

      // Kết quả phải phân bổ thành công cả 2 items
      expect(allocations).toHaveLength(2);
      // Item có variantId nhỏ hơn phải được duyệt và khóa trước
      const smallerVariantId = testVariantAId.localeCompare(testVariantBId) < 0 ? testVariantAId : testVariantBId;
      expect(allocations[0].variantId).toBe(smallerVariantId);
    });
  });
});
