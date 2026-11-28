import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { FefoAllocationService } from '../../application/services/fefo-allocation.service';
import { InventoryReservationService } from '../../application/services/inventory-reservation.service';
import { ReservationCleanupScheduler } from '../schedulers/reservation-cleanup.scheduler';
import { AsyncInfrastructureModule } from '@modules/async-infrastructure';

describe('EPIC 02: End-to-End Cohesive Integrated Lifecycle Flow', () => {
  let service: InventoryReservationService;
  let fefoService: FefoAllocationService;
  let scheduler: ReservationCleanupScheduler;
  let prisma: PrismaClient;
  let testStoreId: string;
  let testVariantId: string;

  beforeAll(async () => {
    jest.setTimeout(40000);
    prisma = new PrismaClient();

    // 1. Tạo Store kiểm thử riêng cho E2E Flow
    const testStore = await prisma.store.upsert({
      where: { code: 'TEST-E2E-EP02-STORE' },
      update: {},
      create: {
        code: 'TEST-E2E-EP02-STORE',
        name: 'Kho Test E2E Epic 02',
        type: 'WAREHOUSE',
        address: '101 Đường E2E Epic 02',
        city: 'Hồ Chí Minh',
        district: 'Tân Bình',
        fulfillmentCapacityPerDay: 2000,
      },
    });
    testStoreId = testStore.id;

    // 2. Lấy ProductVariant hoạt động
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
    fefoService = module.get<FefoAllocationService>(FefoAllocationService);
    scheduler = module.get<ReservationCleanupScheduler>(ReservationCleanupScheduler);
  });

  beforeEach(async () => {
    // Dọn dẹp dữ liệu của store kiểm thử
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

    // Reset bảng inventory: quantity = 100, reserved = 0
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

  it('phải vận hành hoàn hảo toàn bộ vòng đời FEFO & Reservation: Phân bổ -> Giữ chỗ -> Tranh chấp -> Quá hạn hoàn trả -> Tái phân bổ -> Hủy chủ động', async () => {
    const t0 = new Date();

    // ----------------------------------------------------------------------------------
    // GIAI ĐOẠN 1: Thiết lập 3 lô hàng với các mốc hạn dùng khác biệt
    // ----------------------------------------------------------------------------------
    // Lô A (Cận date: HSD 60 ngày < 180 ngày chuẩn): tồn 20
    const lotNearExpiry = await prisma.inventoryLot.create({
      data: {
        locationId: testStoreId,
        productVariantId: testVariantId,
        batchCode: 'BATCH-E2E-NEAR-EXP',
        expiryDate: new Date(t0.getTime() + 60 * 86_400_000),
        quantityOnHand: 20,
        quantityReserved: 0,
      },
    });

    // Lô B (Hạn gần nhất đạt chuẩn: HSD 200 ngày): tồn 10
    const lotValidNear = await prisma.inventoryLot.create({
      data: {
        locationId: testStoreId,
        productVariantId: testVariantId,
        batchCode: 'BATCH-E2E-VALID-NEAR',
        expiryDate: new Date(t0.getTime() + 200 * 86_400_000),
        quantityOnHand: 10,
        quantityReserved: 0,
      },
    });

    // Lô C (Hạn xa: HSD 400 ngày): tồn 20
    const lotValidFar = await prisma.inventoryLot.create({
      data: {
        locationId: testStoreId,
        productVariantId: testVariantId,
        batchCode: 'BATCH-E2E-VALID-FAR',
        expiryDate: new Date(t0.getTime() + 400 * 86_400_000),
        quantityOnHand: 20,
        quantityReserved: 0,
      },
    });

    // Xác nhận ATP ban đầu của cửa hàng là 100
    const initialBalance = await prisma.inventory.findUnique({
      where: { storeId_productVariantId: { storeId: testStoreId, productVariantId: testVariantId } },
    });
    expect(initialBalance?.availableQuantity).toBe(100);

    // ----------------------------------------------------------------------------------
    // GIAI ĐOẠN 2: Khách hàng 1 đặt đơn Online (15 sản phẩm) -> FEFO giữ Lô B và Lô C
    // ----------------------------------------------------------------------------------
    const resCust1 = await prisma.$transaction(async (tx) => {
      return service.createReservation(tx, {
        locationId: testStoreId,
        items: [{ variantId: testVariantId, quantity: 15 }],
        paymentMethod: 'ONLINE',
        ttlMinutes: 15,
        now: t0,
      });
    });

    // Lô A (cận date) bị bỏ qua tuyệt đối (reserved = 0)
    const checkLotA1 = await prisma.inventoryLot.findUnique({ where: { id: lotNearExpiry.id } });
    expect(checkLotA1?.quantityReserved).toBe(0);

    // Lô B (FEFO gần nhất) được lấy trọn vẹn 10 sản phẩm
    const checkLotB1 = await prisma.inventoryLot.findUnique({ where: { id: lotValidNear.id } });
    expect(checkLotB1?.quantityReserved).toBe(10);

    // Lô C lấy bù 5 sản phẩm
    const checkLotC1 = await prisma.inventoryLot.findUnique({ where: { id: lotValidFar.id } });
    expect(checkLotC1?.quantityReserved).toBe(5);

    // Tồn kho ATP tự động giảm 15: 100 - 15 = 85
    const balanceAfterCust1 = await prisma.inventory.findUnique({
      where: { storeId_productVariantId: { storeId: testStoreId, productVariantId: testVariantId } },
    });
    expect(balanceAfterCust1?.reservedQuantity).toBe(15);
    expect(balanceAfterCust1?.availableQuantity).toBe(85);

    // Sổ cái và Outbox Event của Khách 1
    const holdLedger = await prisma.inventoryTransaction.findFirst({
      where: { referenceId: resCust1.id, transactionType: 'RESERVATION_HOLD' },
    });
    expect(holdLedger?.quantity).toBe(15);

    const outboxRes1 = await prisma.outboxEvent.findFirst({
      where: { aggregateId: resCust1.id, eventType: 'INVENTORY_RESERVED' },
    });
    expect(outboxRes1).toBeDefined();

    // ----------------------------------------------------------------------------------
    // GIAI ĐOẠN 3: Khách hàng 2 đặt đơn tranh chấp 20 sản phẩm -> Bị reject do thiếu tồn FEFO
    // (Lô A có 20 nhưng cận date, Lô B hết, Lô C chỉ còn 15 khả dụng -> thiếu 5)
    // ----------------------------------------------------------------------------------
    await expect(
      prisma.$transaction(async (tx) => {
        return service.createReservation(tx, {
          locationId: testStoreId,
          items: [{ variantId: testVariantId, quantity: 20 }],
          paymentMethod: 'ONLINE',
          now: t0,
        });
      }),
    ).rejects.toThrow(ConflictException);

    // Dữ liệu Khách 1 và tồn kho hoàn toàn không bị ảnh hưởng (ACID Rollback)
    const balanceAfterReject = await prisma.inventory.findUnique({
      where: { storeId_productVariantId: { storeId: testStoreId, productVariantId: testVariantId } },
    });
    expect(balanceAfterReject?.reservedQuantity).toBe(15);
    expect(balanceAfterReject?.availableQuantity).toBe(85);

    // ----------------------------------------------------------------------------------
    // GIAI ĐOẠN 4: Khách 1 không thanh toán quá 15 phút -> Scheduler tự động dọn dẹp (EXPIRED)
    // ----------------------------------------------------------------------------------
    const t1 = new Date(t0.getTime() + 16 * 60 * 1000); // 16 phút sau
    const expiredCount = await scheduler.processExpiredReservations(100, t1);
    expect(expiredCount).toBe(1);

    // Kiểm tra trạng thái Reservation của Khách 1
    const resCust1AfterExpire = await prisma.inventoryReservation.findUnique({
      where: { id: resCust1.id },
    });
    expect(resCust1AfterExpire?.status).toBe('EXPIRED');

    // Tồn kho các lô và balances phục hồi 100%
    const checkLotB2 = await prisma.inventoryLot.findUnique({ where: { id: lotValidNear.id } });
    const checkLotC2 = await prisma.inventoryLot.findUnique({ where: { id: lotValidFar.id } });
    expect(checkLotB2?.quantityReserved).toBe(0);
    expect(checkLotC2?.quantityReserved).toBe(0);

    const balanceAfterExpire = await prisma.inventory.findUnique({
      where: { storeId_productVariantId: { storeId: testStoreId, productVariantId: testVariantId } },
    });
    expect(balanceAfterExpire?.reservedQuantity).toBe(0);
    expect(balanceAfterExpire?.availableQuantity).toBe(100); // ATP trở lại 100!

    // Có Outbox Event RESERVATION_RELEASED
    const outboxExpire = await prisma.outboxEvent.findFirst({
      where: { aggregateId: resCust1.id, eventType: 'RESERVATION_RELEASED' },
    });
    expect(outboxExpire).toBeDefined();
    expect((outboxExpire?.payload as any).newStatus).toBe('EXPIRED');

    // ----------------------------------------------------------------------------------
    // GIAI ĐOẠN 5: Khách hàng 2 đặt lại đơn 20 sản phẩm -> Đặt thành công nhờ tồn đã được nhả
    // ----------------------------------------------------------------------------------
    const resCust2 = await prisma.$transaction(async (tx) => {
      return service.createReservation(tx, {
        locationId: testStoreId,
        items: [{ variantId: testVariantId, quantity: 20 }],
        paymentMethod: 'COD',
        now: t1,
      });
    });

    expect(resCust2.status).toBe('ACTIVE');
    // FEFO: Lấy 10 từ Lô B và 10 từ Lô C
    const checkLotB3 = await prisma.inventoryLot.findUnique({ where: { id: lotValidNear.id } });
    const checkLotC3 = await prisma.inventoryLot.findUnique({ where: { id: lotValidFar.id } });
    expect(checkLotB3?.quantityReserved).toBe(10);
    expect(checkLotC3?.quantityReserved).toBe(10);

    // ATP giảm xuống 80
    const balanceAfterCust2 = await prisma.inventory.findUnique({
      where: { storeId_productVariantId: { storeId: testStoreId, productVariantId: testVariantId } },
    });
    expect(balanceAfterCust2?.reservedQuantity).toBe(20);
    expect(balanceAfterCust2?.availableQuantity).toBe(80);

    // ----------------------------------------------------------------------------------
    // GIAI ĐOẠN 6: Khách hàng 2 chủ động hủy đơn -> Giải phóng thủ công (RELEASED) & Idempotency
    // ----------------------------------------------------------------------------------
    const releaseResult = await service.releaseReservationById(resCust2.id, {
      newStatus: 'RELEASED',
      reason: 'Khách hàng đổi ý hủy đơn trước khi giao',
      now: new Date(t1.getTime() + 1000),
    });

    expect(releaseResult.newStatus).toBe('RELEASED');
    expect(releaseResult.releasedItems).toHaveLength(2);

    // Gọi lại lần 2 để kiểm tra tính Idempotency
    const doubleRelease = await service.releaseReservationById(resCust2.id, {
      newStatus: 'RELEASED',
      reason: 'Hủy trùng lặp lần 2',
    });
    expect(doubleRelease.releasedItems).toHaveLength(0); // Không trừ lần nữa

    // Tồn kho phục hồi hoàn toàn về 100, không bị âm
    const finalBalance = await prisma.inventory.findUnique({
      where: { storeId_productVariantId: { storeId: testStoreId, productVariantId: testVariantId } },
    });
    expect(finalBalance?.reservedQuantity).toBe(0);
    expect(finalBalance?.availableQuantity).toBe(100);
  }, 40000);
});
