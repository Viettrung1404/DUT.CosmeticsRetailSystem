import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { FefoAllocationService } from '../fefo-allocation.service';
import { InventoryReservationService } from '../inventory-reservation.service';
import { ReservationCleanupScheduler } from '../../../infrastructure/schedulers/reservation-cleanup.scheduler';
import { AsyncInfrastructureModule } from '@modules/async-infrastructure';

jest.setTimeout(30000);

describe('EP02-T04: Reservation Expiration & Release Engine Integration Tests', () => {
  let service: InventoryReservationService;
  let scheduler: ReservationCleanupScheduler;
  let prisma: PrismaClient;
  let testStoreId: string;
  let testVariantId: string;

  beforeAll(async () => {
    jest.setTimeout(30000);
    prisma = new PrismaClient();

    // 1. Tạo Store test riêng biệt
    const testStore = await prisma.store.upsert({
      where: { code: 'TEST-EXP-STORE' },
      update: {},
      create: {
        code: 'TEST-EXP-STORE',
        name: 'Kho Test Expiration Engine',
        type: 'WAREHOUSE',
        address: '789 Đường Expiration Test',
        city: 'Hồ Chí Minh',
        district: 'Tân Bình',
        fulfillmentCapacityPerDay: 1000,
      },
    });
    testStoreId = testStore.id;

    // 2. Lấy 1 product variant mẫu
    const variant = await prisma.productVariant.findFirst({
      where: { isActive: true },
      select: { id: true },
    });
    if (!variant) throw new Error('Không tìm thấy product variant mẫu!');
    testVariantId = variant.id;

    // Cấu hình min_shelf_life_days = 180
    await prisma.productVariant.update({
      where: { id: testVariantId },
      data: { minShelfLifeDays: 180 },
    });

    const module: TestingModule = await Test.createTestingModule({
      imports: [AsyncInfrastructureModule],
      providers: [
        InventoryReservationService,
        FefoAllocationService,
        ReservationCleanupScheduler,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<InventoryReservationService>(InventoryReservationService);
    scheduler = module.get<ReservationCleanupScheduler>(ReservationCleanupScheduler);
  });

  beforeEach(async () => {
    // Dọn dẹp dữ liệu của store test
    await prisma.inventoryReservationItem.deleteMany({
      where: { reservation: { locationId: testStoreId } },
    });
    await prisma.inventoryReservation.deleteMany({
      where: { locationId: testStoreId },
    });
    await prisma.inventoryLot.deleteMany({
      where: { locationId: testStoreId },
    });
    await prisma.inventoryTransaction.deleteMany({
      where: { storeId: testStoreId },
    });
    await prisma.outboxEvent.deleteMany({
      where: { aggregateType: 'INVENTORY_RESERVATION' },
    });

    // Reset số dư tồn kho bảng inventory: quantity = 100, reserved = 0, available = 100
    await prisma.inventory.upsert({
      where: {
        storeId_productVariantId: {
          storeId: testStoreId,
          productVariantId: testVariantId,
        },
      },
      update: {
        quantity: 100,
        reservedQuantity: 0,
        safetyStock: 0,
        quarantinedQuantity: 0,
        damagedQuantity: 0,
      },
      create: {
        storeId: testStoreId,
        productVariantId: testVariantId,
        quantity: 100,
        reservedQuantity: 0,
        safetyStock: 0,
        quarantinedQuantity: 0,
        damagedQuantity: 0,
      },
    });
  });

  afterAll(async () => {
    // Cleanup sau test
    await prisma.inventoryReservationItem.deleteMany({
      where: { reservation: { locationId: testStoreId } },
    });
    await prisma.inventoryReservation.deleteMany({
      where: { locationId: testStoreId },
    });
    await prisma.inventoryLot.deleteMany({
      where: { locationId: testStoreId },
    });
    await prisma.inventoryTransaction.deleteMany({
      where: { storeId: testStoreId },
    });
    await prisma.outboxEvent.deleteMany({
      where: { aggregateType: 'INVENTORY_RESERVATION' },
    });
    await prisma.$disconnect();
  });

  describe('1. Active Release & ATP Rebound (AC1)', () => {
    it('phải hoàn trả chính xác số lượng giữ chỗ về tồn kho khả dụng (ATP) khi giải phóng', async () => {
      const now = new Date();
      // Tạo 2 lô: Lô 1 (HSD 200 ngày, tồn 10), Lô 2 (HSD 400 ngày, tồn 20)
      const lot1 = await prisma.inventoryLot.create({
        data: {
          locationId: testStoreId,
          productVariantId: testVariantId,
          batchCode: 'BATCH-REL-01',
          expiryDate: new Date(now.getTime() + 200 * 86_400_000),
          quantityOnHand: 10,
          quantityReserved: 0,
        },
      });
      const lot2 = await prisma.inventoryLot.create({
        data: {
          locationId: testStoreId,
          productVariantId: testVariantId,
          batchCode: 'BATCH-REL-02',
          expiryDate: new Date(now.getTime() + 400 * 86_400_000),
          quantityOnHand: 20,
          quantityReserved: 0,
        },
      });

      // Tạo reservation giữ 15 sản phẩm (FEFO: Lô 1 lấy 10, Lô 2 lấy 5)
      const reservation = await prisma.$transaction(async (tx) => {
        return service.createReservation(tx, {
          locationId: testStoreId,
          items: [{ variantId: testVariantId, quantity: 15 }],
          paymentMethod: 'ONLINE',
          now,
        });
      });

      // Kiểm tra trạng thái lúc vừa giữ chỗ
      const lot1AfterRes = await prisma.inventoryLot.findUnique({ where: { id: lot1.id } });
      const lot2AfterRes = await prisma.inventoryLot.findUnique({ where: { id: lot2.id } });
      const balanceAfterRes = await prisma.inventory.findUnique({
        where: { storeId_productVariantId: { storeId: testStoreId, productVariantId: testVariantId } },
      });

      expect(lot1AfterRes?.quantityReserved).toBe(10);
      expect(lot2AfterRes?.quantityReserved).toBe(5);
      expect(balanceAfterRes?.reservedQuantity).toBe(15);
      expect(balanceAfterRes?.availableQuantity).toBe(85); // 100 - 15 = 85

      // Thực hiện giải phóng reservation (chủ động hủy đơn)
      const releaseResult = await prisma.$transaction(async (tx) => {
        return service.releaseReservation(tx, reservation.id, {
          newStatus: 'RELEASED',
          reason: 'Khách hàng chủ động hủy đơn hàng',
          now: new Date(now.getTime() + 5000),
        });
      });

      expect(releaseResult.newStatus).toBe('RELEASED');
      expect(releaseResult.previousStatus).toBe('ACTIVE');
      expect(releaseResult.releasedItems).toHaveLength(2);

      // Kiểm tra tồn kho sau khi giải phóng: ATP phải hồi phục 100% về 100
      const lot1AfterRel = await prisma.inventoryLot.findUnique({ where: { id: lot1.id } });
      const lot2AfterRel = await prisma.inventoryLot.findUnique({ where: { id: lot2.id } });
      const balanceAfterRel = await prisma.inventory.findUnique({
        where: { storeId_productVariantId: { storeId: testStoreId, productVariantId: testVariantId } },
      });

      expect(lot1AfterRel?.quantityReserved).toBe(0);
      expect(lot2AfterRel?.quantityReserved).toBe(0);
      expect(balanceAfterRel?.reservedQuantity).toBe(0);
      expect(balanceAfterRel?.availableQuantity).toBe(100); // ATP phục hồi hoàn toàn!

      // Kiểm tra trạng thái bản ghi Header
      const updatedRes = await prisma.inventoryReservation.findUnique({ where: { id: reservation.id } });
      expect(updatedRes?.status).toBe('RELEASED');

      // Kiểm tra sổ cái giao dịch
      const ledgerEntry = await prisma.inventoryTransaction.findFirst({
        where: {
          referenceId: reservation.id,
          transactionType: 'RESERVATION_RELEASE',
        },
      });
      expect(ledgerEntry).toBeDefined();
      expect(ledgerEntry?.quantity).toBe(15);
      expect(ledgerEntry?.note).toContain('Khách hàng chủ động hủy đơn hàng');

      // Kiểm tra Outbox Event
      const outboxEvent = await prisma.outboxEvent.findFirst({
        where: {
          aggregateId: reservation.id,
          eventType: 'RESERVATION_RELEASED',
        },
      });
      expect(outboxEvent).toBeDefined();
      const payload = outboxEvent?.payload as any;
      expect(payload.newStatus).toBe('RELEASED');
      expect(payload.releasedItems).toHaveLength(2);
    });
  });

  describe('2. Idempotency & Negative Protection (AC2)', () => {
    it('không được trừ âm số lượng giữ chỗ khi gọi release nhiều lần trên cùng một reservation', async () => {
      const now = new Date();
      await prisma.inventoryLot.create({
        data: {
          locationId: testStoreId,
          productVariantId: testVariantId,
          batchCode: 'BATCH-IDEM-01',
          expiryDate: new Date(now.getTime() + 300 * 86_400_000),
          quantityOnHand: 20,
          quantityReserved: 0,
        },
      });

      // Tạo reservation giữ 5 sản phẩm
      const res = await service.releaseReservationById.name; // check service
      const reservation = await prisma.$transaction(async (tx) => {
        return service.createReservation(tx, {
          locationId: testStoreId,
          items: [{ variantId: testVariantId, quantity: 5 }],
          paymentMethod: 'ONLINE',
          now,
        });
      });

      // Lần 1: Giải phóng thành công
      const result1 = await service.releaseReservationById(reservation.id, {
        newStatus: 'RELEASED',
        reason: 'Hủy lần 1',
      });
      expect(result1.newStatus).toBe('RELEASED');
      expect(result1.releasedItems).toHaveLength(1);

      // Lần 2: Gọi lại giải phóng cho cùng reservation
      const result2 = await service.releaseReservationById(reservation.id, {
        newStatus: 'RELEASED',
        reason: 'Hủy lần 2 (trùng lặp)',
      });
      // Idempotency: Không xử lý lại, trả về releasedItems rỗng
      expect(result2.newStatus).toBe('RELEASED');
      expect(result2.releasedItems).toHaveLength(0);

      // Xác minh số dư không bị âm (Check constraint DB bảo vệ, giá trị là 0)
      const balance = await prisma.inventory.findUnique({
        where: { storeId_productVariantId: { storeId: testStoreId, productVariantId: testVariantId } },
      });
      expect(balance?.reservedQuantity).toBe(0);
      expect(balance?.availableQuantity).toBe(100);

      // Sổ cái chỉ có đúng 1 bản ghi RESERVATION_RELEASE
      const releaseTxCount = await prisma.inventoryTransaction.count({
        where: {
          referenceId: reservation.id,
          transactionType: 'RESERVATION_RELEASE',
        },
      });
      expect(releaseTxCount).toBe(1);
    });
  });

  describe('3. Automated Expiration via ReservationCleanupScheduler', () => {
    it(
      'phải tự động quét và giải phóng các reservation đã quá hạn (expires_at < NOW)',
      async () => {
      const now = new Date();
      await prisma.inventoryLot.create({
        data: {
          locationId: testStoreId,
          productVariantId: testVariantId,
          batchCode: 'BATCH-SCHED-01',
          expiryDate: new Date(now.getTime() + 365 * 86_400_000),
          quantityOnHand: 50,
          quantityReserved: 0,
        },
      });

      // Tạo Reservation 1: Quá hạn 10 phút trước
      const res1 = await prisma.$transaction(async (tx) => {
        return service.createReservation(tx, {
          locationId: testStoreId,
          items: [{ variantId: testVariantId, quantity: 4 }],
          ttlMinutes: 15,
          now: new Date(now.getTime() - 25 * 60 * 1000), // Tạo cách đây 25m -> hết hạn cách đây 10m
        });
      });

      // Tạo Reservation 2: Quá hạn 2 phút trước
      const res2 = await prisma.$transaction(async (tx) => {
        return service.createReservation(tx, {
          locationId: testStoreId,
          items: [{ variantId: testVariantId, quantity: 6 }],
          ttlMinutes: 15,
          now: new Date(now.getTime() - 17 * 60 * 1000), // Tạo cách đây 17m -> hết hạn cách đây 2m
        });
      });

      // Tạo Reservation 3: Vẫn CÒN HẠN (hết hạn sau 10 phút)
      const res3 = await prisma.$transaction(async (tx) => {
        return service.createReservation(tx, {
          locationId: testStoreId,
          items: [{ variantId: testVariantId, quantity: 5 }],
          ttlMinutes: 15,
          now, // Hết hạn lúc now + 15m
        });
      });

      // Kiểm tra tổng reserved trước khi chạy Scheduler: 4 + 6 + 5 = 15
      const balanceBefore = await prisma.inventory.findUnique({
        where: { storeId_productVariantId: { storeId: testStoreId, productVariantId: testVariantId } },
      });
      expect(balanceBefore?.reservedQuantity).toBe(15);
      expect(balanceBefore?.availableQuantity).toBe(85);

      // Kích hoạt tiến trình quét Reservation quá hạn
      const cleanedCount = await scheduler.processExpiredReservations(100, now);
      expect(cleanedCount).toBe(2); // Chỉ quét và giải phóng Res 1 và Res 2

      // Kiểm tra trạng thái của từng Reservation
      const checkRes1 = await prisma.inventoryReservation.findUnique({ where: { id: res1.id } });
      const checkRes2 = await prisma.inventoryReservation.findUnique({ where: { id: res2.id } });
      const checkRes3 = await prisma.inventoryReservation.findUnique({ where: { id: res3.id } });

      expect(checkRes1?.status).toBe('EXPIRED');
      expect(checkRes2?.status).toBe('EXPIRED');
      expect(checkRes3?.status).toBe('ACTIVE'); // Res 3 vẫn còn hạn, không bị động chạm!

      // Số dư giữ chỗ chỉ còn lại của Res 3 (5 sản phẩm), tồn ATP phục hồi về 95
      const balanceAfter = await prisma.inventory.findUnique({
        where: { storeId_productVariantId: { storeId: testStoreId, productVariantId: testVariantId } },
      });
      expect(balanceAfter?.reservedQuantity).toBe(5);
      expect(balanceAfter?.availableQuantity).toBe(95);

      // Kiểm tra Outbox Event của 2 reservation hết hạn
      const outboxExpiredEvents = await prisma.outboxEvent.findMany({
        where: {
          aggregateId: { in: [res1.id, res2.id] },
          eventType: 'RESERVATION_RELEASED',
        },
      });
      expect(outboxExpiredEvents).toHaveLength(2);
      for (const ev of outboxExpiredEvents) {
        expect((ev.payload as any).newStatus).toBe('EXPIRED');
      }
    }, 30000);
  });

  describe('4. Concurrency & Multi-worker Safety (SKIP LOCKED)', () => {
    it(
      'nhiều worker quét đồng thời không gây tranh chấp hoặc xử lý trùng lặp',
      async () => {
      const now = new Date();
      await prisma.inventoryLot.create({
        data: {
          locationId: testStoreId,
          productVariantId: testVariantId,
          batchCode: 'BATCH-CONCURR-01',
          expiryDate: new Date(now.getTime() + 300 * 86_400_000),
          quantityOnHand: 100,
          quantityReserved: 0,
        },
      });

      // Tạo 4 reservation hết hạn
      const expiredResIds: string[] = [];
      for (let i = 0; i < 4; i++) {
        const res = await prisma.$transaction(async (tx) => {
          return service.createReservation(tx, {
            locationId: testStoreId,
            items: [{ variantId: testVariantId, quantity: 2 }],
            ttlMinutes: 15,
            now: new Date(now.getTime() - 20 * 60 * 1000), // đã hết hạn
          });
        });
        expiredResIds.push(res.id);
      }

      // 2 Worker chạy song song cạnh tranh các bản ghi quá hạn
      const [worker1Processed, worker2Processed] = await Promise.all([
        scheduler.processExpiredReservations(10, now),
        scheduler.processExpiredReservations(10, now),
      ]);

      // Tổng số bản ghi được xử lý bởi cả 2 workers phải bằng đúng 4
      expect(worker1Processed + worker2Processed).toBe(4);

      // Tất cả 4 reservation đều phải ở trạng thái EXPIRED
      const updatedReservations = await prisma.inventoryReservation.findMany({
        where: { id: { in: expiredResIds } },
      });
      for (const res of updatedReservations) {
        expect(res.status).toBe('EXPIRED');
      }

      // Toàn bộ số lượng giữ chỗ được hoàn trả sạch sẽ về 0
      const balance = await prisma.inventory.findUnique({
        where: { storeId_productVariantId: { storeId: testStoreId, productVariantId: testVariantId } },
      });
      expect(balance?.reservedQuantity).toBe(0);
      expect(balance?.availableQuantity).toBe(100);
    }, 30000);
  });
});
