import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { FefoAllocationService } from '../fefo-allocation.service';
import { InventoryReservationService } from '../inventory-reservation.service';
import { AsyncInfrastructureModule } from '@modules/async-infrastructure';

describe('EP02-T03: InventoryReservationService Integration & Concurrency Tests', () => {
  let service: InventoryReservationService;
  let fefoService: FefoAllocationService;
  let prisma: PrismaClient;
  let testStoreId: string;
  let testVariantId: string;

  beforeAll(async () => {
    prisma = new PrismaClient();

    // 1. Tạo Store test riêng biệt
    const testStore = await prisma.store.upsert({
      where: { code: 'TEST-RES-STORE' },
      update: {},
      create: {
        code: 'TEST-RES-STORE',
        name: 'Kho Test Reservation',
        type: 'WAREHOUSE',
        address: '456 Đường Test Reservation',
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
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<InventoryReservationService>(InventoryReservationService);
    fefoService = module.get<FefoAllocationService>(FefoAllocationService);
  });

  beforeEach(async () => {
    // Dọn dẹp reservations và lots cũ của store test
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

    // Reset số dư bảng inventory cho variant tại testStoreId: quantity = 100, reserved = 0
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
    await prisma.inventory.deleteMany({
      where: { storeId: testStoreId },
    });
    await prisma.store.deleteMany({
      where: { code: 'TEST-RES-STORE' },
    });
    await prisma.$disconnect();
  });

  describe('1. Reservation Status, TTL & Expiration Alignment (AC1)', () => {
    it('phải tạo reservation với status ACTIVE và expiresAt = Now + 15 phút cho đơn thanh toán Online', async () => {
      const now = new Date('2026-11-16T10:00:00.000Z');
      const expDate = new Date(now.getTime() + 300 * 86_400_000);

      // Tạo lô hàng hợp lệ (tồn 50)
      await prisma.inventoryLot.create({
        data: {
          locationId: testStoreId,
          productVariantId: testVariantId,
          batchCode: 'RES-TEST-LOT-ONLINE',
          expiryDate: expDate,
          quantityOnHand: 50,
          quantityReserved: 0,
        },
      });

      const result = await prisma.$transaction(async (tx) => {
        return service.createReservation(tx, {
          locationId: testStoreId,
          items: [{ variantId: testVariantId, quantity: 5 }],
          paymentMethod: 'VNPAY', // Online payment
          now,
        });
      });

      expect(result.id).toBeDefined();
      expect(result.status).toBe('ACTIVE');
      // Kỳ vọng: Now + 15 phút = 10:15:00.000Z
      expect(result.expiresAt.toISOString()).toBe('2026-11-16T10:15:00.000Z');
    });

    it('phải tạo reservation với status ACTIVE và expiresAt = Now + 30 phút cho đơn thanh toán COD', async () => {
      const now = new Date('2026-11-16T10:00:00.000Z');
      const expDate = new Date(now.getTime() + 300 * 86_400_000);

      await prisma.inventoryLot.create({
        data: {
          locationId: testStoreId,
          productVariantId: testVariantId,
          batchCode: 'RES-TEST-LOT-COD',
          expiryDate: expDate,
          quantityOnHand: 50,
          quantityReserved: 0,
        },
      });

      const result = await prisma.$transaction(async (tx) => {
        return service.createReservation(tx, {
          locationId: testStoreId,
          items: [{ variantId: testVariantId, quantity: 10 }],
          paymentMethod: 'COD',
          now,
        });
      });

      expect(result.status).toBe('ACTIVE');
      // Kỳ vọng: Now + 30 phút = 10:30:00.000Z
      expect(result.expiresAt.toISOString()).toBe('2026-11-16T10:30:00.000Z');
    });
  });

  describe('2. Consistency Across Lots, Balances & Ledger (AC2)', () => {
    it('phải đồng bộ tuyệt đối giữa số lượng lô, reserved_quantity trên balance và sổ cái giao dịch', async () => {
      const now = new Date();
      // Tạo 2 lô: Lô 1 (HSD 200d, tồn 8), Lô 2 (HSD 365d, tồn 20)
      const lot1 = await prisma.inventoryLot.create({
        data: {
          locationId: testStoreId,
          productVariantId: testVariantId,
          batchCode: 'RES-TEST-LOT-1',
          expiryDate: new Date(now.getTime() + 200 * 86_400_000),
          quantityOnHand: 8,
          quantityReserved: 0,
        },
      });

      const lot2 = await prisma.inventoryLot.create({
        data: {
          locationId: testStoreId,
          productVariantId: testVariantId,
          batchCode: 'RES-TEST-LOT-2',
          expiryDate: new Date(now.getTime() + 365 * 86_400_000),
          quantityOnHand: 20,
          quantityReserved: 0,
        },
      });

      // Yêu cầu giữ chỗ 15 sản phẩm (cần 8 từ lot1 và 7 từ lot2)
      const reservationDto = await prisma.$transaction(async (tx) => {
        return service.createReservation(tx, {
          locationId: testStoreId,
          items: [{ variantId: testVariantId, quantity: 15 }],
          paymentMethod: 'ONLINE',
          now,
        });
      });

      // 1. Kiểm tra items của reservation
      expect(reservationDto.allocatedItems).toHaveLength(2);
      expect(reservationDto.allocatedItems[0].lotId).toBe(lot1.id);
      expect(reservationDto.allocatedItems[0].quantity).toBe(8);
      expect(reservationDto.allocatedItems[1].lotId).toBe(lot2.id);
      expect(reservationDto.allocatedItems[1].quantity).toBe(7);

      // 2. Kiểm tra cập nhật trên từng lô (inventory_lots)
      const updatedLot1 = await prisma.inventoryLot.findUnique({ where: { id: lot1.id } });
      const updatedLot2 = await prisma.inventoryLot.findUnique({ where: { id: lot2.id } });
      expect(updatedLot1?.quantityReserved).toBe(8);
      expect(updatedLot2?.quantityReserved).toBe(7);

      // 3. Kiểm tra cập nhật trên bảng số dư tổng (inventory / inventory_balances)
      const balance = await prisma.inventory.findUnique({
        where: {
          storeId_productVariantId: {
            storeId: testStoreId,
            productVariantId: testVariantId,
          },
        },
      });
      // Tổng giữ chỗ trên balance phải đúng bằng 15
      expect(balance?.reservedQuantity).toBe(15);
      // available_quantity (cột STORED ATP) = 100 - 15 = 85
      expect(balance?.availableQuantity).toBe(85);

      // 4. Kiểm tra sổ cái giao dịch (inventory_transactions)
      const txHistory = await prisma.inventoryTransaction.findMany({
        where: {
          storeId: testStoreId,
          productVariantId: testVariantId,
          referenceId: reservationDto.id,
        },
      });
      expect(txHistory).toHaveLength(1);
      expect(txHistory[0].transactionType).toBe('RESERVATION_HOLD');
      expect(txHistory[0].quantity).toBe(15);
    });
  });

  describe('3. Transactional Outbox Integration & ACID Rollback (AC3)', () => {
    it('phải ghi nhận Outbox Event INVENTORY_RESERVED đồng thời trong cùng transaction', async () => {
      const now = new Date();
      await prisma.inventoryLot.create({
        data: {
          locationId: testStoreId,
          productVariantId: testVariantId,
          batchCode: 'RES-TEST-OUTBOX',
          expiryDate: new Date(now.getTime() + 300 * 86_400_000),
          quantityOnHand: 40,
          quantityReserved: 0,
        },
      });

      const res = await prisma.$transaction(async (tx) => {
        return service.createReservation(tx, {
          locationId: testStoreId,
          items: [{ variantId: testVariantId, quantity: 10 }],
          paymentMethod: 'ONLINE',
          now,
        });
      });

      // Kiểm tra sự kiện Outbox trong database
      const outboxEvent = await prisma.outboxEvent.findFirst({
        where: {
          aggregateId: res.id,
          eventType: 'INVENTORY_RESERVED',
        },
      });

      expect(outboxEvent).toBeDefined();
      expect(outboxEvent?.status).toBe('PENDING');
      expect(outboxEvent?.aggregateType).toBe('INVENTORY_RESERVATION');

      const payload = outboxEvent?.payload as any;
      expect(payload.reservationId).toBe(res.id);
      expect(payload.status).toBe('ACTIVE');
      expect(payload.items).toHaveLength(1);
      expect(payload.items[0].quantity).toBe(10);
    });

    it('phải rollback sạch sẽ toàn bộ reservation, balance và outbox khi transaction bị lỗi (ACID)', async () => {
      const now = new Date();
      const lot = await prisma.inventoryLot.create({
        data: {
          locationId: testStoreId,
          productVariantId: testVariantId,
          batchCode: 'RES-TEST-ROLLBACK',
          expiryDate: new Date(now.getTime() + 300 * 86_400_000),
          quantityOnHand: 40,
          quantityReserved: 0,
        },
      });

      let failed = false;
      try {
        await prisma.$transaction(async (tx) => {
          await service.createReservation(tx, {
            locationId: testStoreId,
            items: [{ variantId: testVariantId, quantity: 10 }],
            paymentMethod: 'ONLINE',
            now,
          });

          // Cố tình ném lỗi sau khi createReservation
          throw new Error('SIMULATED_ORDER_CREATION_FAILURE');
        });
      } catch (err: any) {
        if (err.message === 'SIMULATED_ORDER_CREATION_FAILURE') {
          failed = true;
        }
      }

      expect(failed).toBe(true);

      // Xác minh số dư lô hàng không bị giữ chỗ
      const checkLot = await prisma.inventoryLot.findUnique({ where: { id: lot.id } });
      expect(checkLot?.quantityReserved).toBe(0);

      // Xác minh số dư tổng balance vẫn là 0 reserved
      const balance = await prisma.inventory.findUnique({
        where: {
          storeId_productVariantId: {
            storeId: testStoreId,
            productVariantId: testVariantId,
          },
        },
      });
      expect(balance?.reservedQuantity).toBe(0);

      // Xác minh không có bản ghi outbox nào bị commit mồ côi
      const outboxCount = await prisma.outboxEvent.count({
        where: { aggregateType: 'INVENTORY_RESERVATION' },
      });
      expect(outboxCount).toBe(0);
    });
  });

  describe('4. Concurrency & Zero Overselling Protection', () => {
    it('phải bảo đảm Zero Overselling khi 10 giao dịch cạnh tranh số lượng hàng có hạn', async () => {
      const now = new Date();
      // Lô hàng chỉ có 25 sản phẩm
      await prisma.inventoryLot.create({
        data: {
          locationId: testStoreId,
          productVariantId: testVariantId,
          batchCode: 'RES-CONCURRENT-LOT',
          expiryDate: new Date(now.getTime() + 300 * 86_400_000),
          quantityOnHand: 25,
          quantityReserved: 0,
        },
      });

      // Cập nhật tồn vật lý bảng inventory cũng đúng bằng 25
      await prisma.inventory.update({
        where: {
          storeId_productVariantId: {
            storeId: testStoreId,
            productVariantId: testVariantId,
          },
        },
        data: {
          quantity: 25,
          reservedQuantity: 0,
        },
      });

      // Tạo 10 giao dịch đồng thời, mỗi giao dịch muốn giữ chỗ 5 sản phẩm.
      // Tổng nhu cầu = 10 * 5 = 50 sản phẩm.
      // Nhưng tổng tồn khả dụng chỉ có 25 sản phẩm.
      // Kỳ vọng: Đúng chính xác 5 giao dịch thành công (5 * 5 = 25) và 5 giao dịch thất bại (ConflictException)!
      const concurrentTasks = Array.from({ length: 10 }, (_, index) => {
        return prisma.$transaction(async (tx) => {
          return service.createReservation(tx, {
            locationId: testStoreId,
            items: [{ variantId: testVariantId, quantity: 5 }],
            paymentMethod: 'ONLINE',
            now,
          });
        });
      });

      const results = await Promise.allSettled(concurrentTasks);

      const successfulReservations = results.filter((r) => r.status === 'fulfilled');
      const failedReservations = results.filter((r) => r.status === 'rejected');

      // Đúng 5 đơn thành công và 5 đơn bị reject do hết hàng
      expect(successfulReservations).toHaveLength(5);
      expect(failedReservations).toHaveLength(5);

      // Kiểm tra các lỗi thất bại đều là LOT_SHORTAGE
      failedReservations.forEach((failure: any) => {
        expect(failure.reason.message).toMatch(/LOT_SHORTAGE/i);
      });

      // Kiểm tra số dư cuối cùng: reservedQuantity phải đúng chính xác bằng 25, không bao giờ vượt quá
      const finalBalance = await prisma.inventory.findUnique({
        where: {
          storeId_productVariantId: {
            storeId: testStoreId,
            productVariantId: testVariantId,
          },
        },
      });
      expect(finalBalance?.reservedQuantity).toBe(25);
      expect(finalBalance?.availableQuantity).toBe(0); // Hết sạch ATP, không bị âm
    });
  });
});
