import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { AtpCalculatorService } from '../../application/services/atp-calculator.service';
import { InventoryBalanceService } from '../../application/services/inventory-balance.service';
import { LocationService } from '../../application/services/location.service';
import { OutboxWriterService } from '../../../async-infrastructure/outbox/outbox-writer.service';
import { BaseDomainEvent } from '../../../async-infrastructure/outbox/base-domain-event';

describe('EPIC 01 – Location & Inventory Foundation: Cohesive Integrated E2E Flow', () => {
  let prisma: PrismaClient;
  let atpCalculator: AtpCalculatorService;
  let inventoryBalanceService: InventoryBalanceService;
  let locationService: LocationService;
  let outboxWriter: OutboxWriterService;

  let warehouseId: string;
  let showroomId: string;
  let testVariantId: string;
  const createdEventIds: string[] = [];

  beforeAll(async () => {
    prisma = new PrismaClient();
    atpCalculator = new AtpCalculatorService();
    inventoryBalanceService = new InventoryBalanceService(prisma as any, atpCalculator);
    locationService = new LocationService(prisma as any);
    outboxWriter = new OutboxWriterService();

    // Lấy thông tin kho và showroom thực tế từ seed
    const wh = await prisma.store.findUnique({ where: { code: 'WH-TB' } });
    if (!wh) throw new Error('Không tìm thấy kho WH-TB');
    warehouseId = wh.id;

    const showroom = await prisma.store.findUnique({ where: { code: 'STORE-03' } });
    if (!showroom) throw new Error('Không tìm thấy showroom STORE-03');
    showroomId = showroom.id;

    // Lấy variant có sẵn trong kho
    const inv = await prisma.inventory.findFirst({
      where: { storeId: warehouseId, quantity: { gt: 10 } },
    });
    if (!inv) throw new Error('Không tìm thấy inventory mẫu tại kho WH-TB');
    testVariantId = inv.productVariantId;
  });

  afterAll(async () => {
    if (createdEventIds.length > 0) {
      await prisma.outboxEvent.deleteMany({
        where: { id: { in: createdEventIds } },
      });
    }
    await prisma.$disconnect();
  });

  describe('1. Location & Realtime Capacity Integration', () => {
    it('phải truy vấn danh sách locations với operatingStatus chính xác', async () => {
      const locations = await locationService.listLocations({ isActive: true });
      expect(locations.length).toBeGreaterThanOrEqual(4);

      const wh = locations.find((l) => l.code === 'WH-TB');
      expect(wh).toBeDefined();
      expect(wh?.type).toBe('WAREHOUSE');
      expect(wh?.fulfillmentCapacityPerDay).toBe(2500);
      expect(wh?.operatingStatus).toBeDefined();
      expect(wh?.operatingStatus.currentLocalTime).toMatch(/^\d{2}:\d{2}$/);

      const store = locations.find((l) => l.code === 'STORE-03');
      expect(store).toBeDefined();
      expect(store?.type).toBe('STORE');
      expect(store?.fulfillmentCapacityPerDay).toBe(500);
    });

    it('phải kiểm tra năng lực hoàn tất trong ngày của Central Warehouse', async () => {
      const capacity = await locationService.getLocationCapacity(warehouseId);

      expect(capacity.locationId).toBe(warehouseId);
      expect(capacity.locationCode).toBe('WH-TB');
      expect(capacity.capacityPerDay).toBe(2500);
      expect(capacity.allocatedOrdersToday).toBeGreaterThanOrEqual(0);
      expect(capacity.remainingCapacityToday).toBe(
        Math.max(0, capacity.capacityPerDay - capacity.allocatedOrdersToday),
      );
      expect(capacity.isCapacityAvailable).toBe(
        capacity.allocatedOrdersToday < capacity.capacityPerDay,
      );
    });
  });

  describe('2. Inventory Balance & ATP Formula Consistency', () => {
    it('phải tính toán ATP trong Domain Service khớp chính xác với cột STORED trong Database', async () => {
      const dbRecord = await prisma.inventory.findUnique({
        where: {
          storeId_productVariantId: {
            storeId: warehouseId,
            productVariantId: testVariantId,
          },
        },
      });
      expect(dbRecord).toBeDefined();

      const balanceDto = await inventoryBalanceService.getBalance(warehouseId, testVariantId);
      expect(balanceDto).toBeDefined();

      // Công thức tính toán của Domain Service
      const calculatedAtp = atpCalculator.calculateAtp({
        physicalOnHand: dbRecord!.quantity,
        reservedQuantity: dbRecord!.reservedQuantity,
        safetyStock: dbRecord!.safetyStock,
        quarantinedQuantity: dbRecord!.quarantinedQuantity,
        damagedQuantity: dbRecord!.damagedQuantity,
      });

      // So sánh giữa Domain Service, DTO và Database Generated Column
      expect(balanceDto?.availableQuantity).toBe(calculatedAtp);
      expect(dbRecord?.availableQuantity).toBe(calculatedAtp);
    });

    it('phải kiểm tra tính sẵn sàng tồn kho của giỏ hàng qua checkAvailability', async () => {
      const result = await inventoryBalanceService.checkAvailability(warehouseId, [
        { variantId: testVariantId, quantity: 1 },
      ]);

      expect(result.isAvailable).toBe(true);
      expect(result.shortfalls).toHaveLength(0);
    });
  });

  describe('3. Transactional Outbox End-to-End Business Flow', () => {
    it('phải thực thi trọn vẹn luồng giữ chỗ nghiệp vụ kèm phát sinh Outbox Event trong cùng transaction', async () => {
      const eventId = randomUUID();
      createdEventIds.push(eventId);

      const event: BaseDomainEvent = {
        id: eventId,
        aggregateType: 'ORDER',
        aggregateId: 'ord_e2e_epic01',
        eventType: 'ORDER_RESERVED',
        occurredAt: new Date(),
        payload: {
          locationId: warehouseId,
          variantId: testVariantId,
          quantity: 2,
          notes: 'EPIC 01 E2E Cohesive Test',
        },
      };

      await prisma.$transaction(async (tx) => {
        // 1. Kiểm tra tồn ATP
        const balance = await inventoryBalanceService.getBalance(warehouseId, testVariantId, tx);
        expect(balance).toBeDefined();
        expect(balance!.availableQuantity).toBeGreaterThanOrEqual(2);

        // 2. Ghi sự kiện Outbox
        const outboxRecord = await outboxWriter.record(tx, event);
        expect(outboxRecord.id).toBe(eventId);
        expect(outboxRecord.status).toBe('PENDING');
      });

      // 3. Sau commit: Kiểm tra event đã có mặt trong database
      const savedEvent = await prisma.outboxEvent.findUnique({
        where: { id: eventId },
      });

      expect(savedEvent).toBeDefined();
      expect(savedEvent?.aggregateType).toBe('ORDER');
      expect(savedEvent?.status).toBe('PENDING');
      expect(savedEvent?.retryCount).toBe(0);
    });

    it('phải bảo đảm tính ACID tuyệt đối: Rollback cả Outbox Event khi transaction thất bại', async () => {
      const doomedEventId = randomUUID();

      const event: BaseDomainEvent = {
        id: doomedEventId,
        aggregateType: 'ORDER',
        aggregateId: 'ord_fail_epic01',
        eventType: 'ORDER_RESERVED',
        payload: { simulated: true },
      };

      await expect(
        prisma.$transaction(async (tx) => {
          await outboxWriter.record(tx, event);
          throw new Error('EPIC01_SIMULATED_TRANSACTION_FAILURE');
        }),
      ).rejects.toThrow('EPIC01_SIMULATED_TRANSACTION_FAILURE');

      const savedEvent = await prisma.outboxEvent.findUnique({
        where: { id: doomedEventId },
      });
      expect(savedEvent).toBeNull();
    });
  });
});
