import { Test, TestingModule } from '@nestjs/testing';
import { ReturnToOriginService } from '../return-to-origin.service';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { OrderStateAggregator } from '@modules/oms/application/services/order-state-aggregator';
import { OUTBOX_WRITER } from '@modules/async-infrastructure';
import { RtoPackageCondition } from '../../../presentation/dtos/return-to-origin.dto';
import { BadRequestException, NotFoundException } from '@nestjs/common';


describe('EP08-T03: ReturnToOriginService (RTO Workflow & Inventory Restocking)', () => {
  let service: ReturnToOriginService;
  let prisma: PrismaService;
  let orderStateAggregator: OrderStateAggregator;
  let outboxWriter: any;

  let mockShipments: Map<string, any>;
  let mockLots: Map<string, any>;
  let mockBalances: Map<string, any>;
  let mockOutbox: any[];

  beforeEach(async () => {
    mockShipments = new Map();
    mockLots = new Map();
    mockBalances = new Map();
    mockOutbox = [];

    const mockPrisma = {
      shipment: {
        findFirst: jest.fn().mockImplementation(async ({ where }) => {
          for (const s of mockShipments.values()) {
            if (
              where.OR?.some(
                (c: any) =>
                  (c.id && c.id === s.id) ||
                  (c.trackingCode && c.trackingCode === s.trackingCode) ||
                  (c.shipmentCode && c.shipmentCode === s.shipmentCode),
              )
            ) {
              return s;
            }
          }
          return null;
        }),
        update: jest.fn().mockImplementation(async ({ where, data }) => {
          const s = mockShipments.get(where.id);
          if (s) {
            const updated = { ...s, ...data };
            mockShipments.set(where.id, updated);
            return updated;
          }
          return null;
        }),
      },
      inventoryLot: {
        update: jest.fn().mockImplementation(async ({ where, data }) => {
          const lot = mockLots.get(where.id);
          if (lot) {
            lot.quantityOnHand += data.quantityOnHand.increment || 0;
            return lot;
          }
          return null;
        }),
      },
      inventory: {
        update: jest.fn().mockImplementation(async ({ where, data }) => {
          const key = `${where.storeId_productVariantId.storeId}:${where.storeId_productVariantId.productVariantId}`;
          const bal = mockBalances.get(key);
          if (bal) {
            if (data.quantity?.increment) {
              bal.quantity += data.quantity.increment;
            }
            if (data.quarantinedQuantity?.increment) {
              bal.quarantinedQuantity += data.quarantinedQuantity.increment;
            }
            return bal;
          }
          return null;
        }),
      },
      fulfillmentOrder: {
        update: jest.fn().mockImplementation(async ({ where, data }) => {
          return { id: where.id, ...data };
        }),
      },
      $transaction: jest.fn().mockImplementation(async (callback) => {
        return callback(mockPrisma);
      }),
    };

    const mockAggregator = {
      computeOrderStatus: jest.fn().mockResolvedValue({
        orderId: 'order-123',
        newStatus: 'RETURNED',
        hasChanged: true,
      }),
    };

    const mockWriter = {
      record: jest.fn().mockImplementation(async (client, event) => {
        mockOutbox.push(event);
        return { id: 'outbox-1', ...event };
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReturnToOriginService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: OrderStateAggregator, useValue: mockAggregator },
        { provide: OUTBOX_WRITER, useValue: mockWriter },
      ],
    }).compile();

    service = module.get<ReturnToOriginService>(ReturnToOriginService);
    prisma = module.get<PrismaService>(PrismaService);
    orderStateAggregator = module.get<OrderStateAggregator>(OrderStateAggregator);
    outboxWriter = module.get(OUTBOX_WRITER);
  });

  describe('AC2: Tiếp nhận kiện hoàn RTO NGUYÊN SEAL (INTACT)', () => {
    it('Khôi phục tồn kho chính xác tới từng InventoryLot và số dư Sellable Stock', async () => {
      const locationId = 'store-tan-binh-uuid';
      const variant1 = 'var-serum-uuid';
      const variant2 = 'var-cream-uuid';
      const lot1Id = 'lot-batch-001';
      const lot2Id = 'lot-batch-002';

      // Setup Lots ban đầu
      mockLots.set(lot1Id, { id: lot1Id, quantityOnHand: 10 });
      mockLots.set(lot2Id, { id: lot2Id, quantityOnHand: 20 });

      // Setup Balances ban đầu
      mockBalances.set(`${locationId}:${variant1}`, {
        storeId: locationId,
        productVariantId: variant1,
        quantity: 10,
        quarantinedQuantity: 0,
      });
      mockBalances.set(`${locationId}:${variant2}`, {
        storeId: locationId,
        productVariantId: variant2,
        quantity: 20,
        quarantinedQuantity: 0,
      });

      // Setup Shipment liên kết Reservation
      const shipment = {
        id: 'shipment-rto-01',
        orderId: 'order-rto-01',
        trackingCode: 'LAD-RTO-INTACT',
        shipmentCode: 'SHIP-RTO-01',
        status: 'RETURNING',
        fulfillmentOrderId: 'fo-rto-01',
        fulfillmentOrder: {
          id: 'fo-rto-01',
          sourceLocationId: locationId,
          reservation: {
            items: [
              { lotId: lot1Id, productVariantId: variant1, quantity: 2 },
              { lotId: lot2Id, productVariantId: variant2, quantity: 3 },
            ],
          },

        },
        carrierMetadata: {},
      };
      mockShipments.set(shipment.id, shipment);

      const result = await service.receiveRtoShipment(shipment.id, {
        packageCondition: RtoPackageCondition.INTACT,
        notes: 'Kiện hàng nguyên tem niêm phong, ngoại quan tốt',
        receivedById: 'warehouse-staff-01',
      });

      expect(result.success).toBe(true);
      expect(result.status).toBe('RETURNED');
      expect(result.packageCondition).toBe(RtoPackageCondition.INTACT);
      expect(result.restockedLots.length).toBe(2);
      expect(result.quarantinedItems.length).toBe(0);

      // Verify Lots were accurately incremented
      expect(mockLots.get(lot1Id).quantityOnHand).toBe(12); // 10 + 2
      expect(mockLots.get(lot2Id).quantityOnHand).toBe(23); // 20 + 3

      // Verify Balances were incremented
      expect(mockBalances.get(`${locationId}:${variant1}`).quantity).toBe(12);
      expect(mockBalances.get(`${locationId}:${variant2}`).quantity).toBe(23);

      // Quarantined quantity must remain 0
      expect(mockBalances.get(`${locationId}:${variant1}`).quarantinedQuantity).toBe(0);

      // Verify Shipment status updated to RETURNED
      expect(mockShipments.get(shipment.id).status).toBe('RETURNED');

      // Verify Outbox Event emitted
      expect(mockOutbox.length).toBe(1);
      expect(mockOutbox[0].eventType).toBe('SHIPMENT_RETURNED_TO_ORIGIN');
      expect(mockOutbox[0].payload.packageCondition).toBe('INTACT');

      // Verify OrderStateAggregator called
      expect(orderStateAggregator.computeOrderStatus).toHaveBeenCalledWith(
        'order-rto-01',
        expect.anything(),
      );
    });
  });

  describe('Tiếp nhận kiện hoàn RTO RÁCH NÁT / HƯ HỎNG (DAMAGED)', () => {
    it('Đưa toàn bộ sản phẩm vào diện cách ly QUARANTINED, không tăng Sellable Stock trên Lot', async () => {
      const locationId = 'store-tan-binh-uuid';
      const variantId = 'var-fragile-perfume';
      const lotId = 'lot-perfume-001';

      mockLots.set(lotId, { id: lotId, quantityOnHand: 5 });
      mockBalances.set(`${locationId}:${variantId}`, {
        storeId: locationId,
        productVariantId: variantId,
        quantity: 5,
        quarantinedQuantity: 0,
      });

      const shipment = {
        id: 'shipment-rto-damaged',
        orderId: 'order-damaged-01',
        trackingCode: 'LAD-RTO-DAMAGED',
        status: 'RETURNING',
        fulfillmentOrderId: 'fo-damaged-01',
        fulfillmentOrder: {
          id: 'fo-damaged-01',
          sourceLocationId: locationId,
          reservation: {
            items: [
              { lotId, productVariantId: variantId, quantity: 4 },
            ],
          },

        },
      };
      mockShipments.set(shipment.id, shipment);

      const result = await service.receiveRtoShipment(shipment.id, {
        packageCondition: RtoPackageCondition.DAMAGED,
        notes: 'Chai nước hoa bị vỡ trong thùng, ướt sũng bao bì',
      });

      expect(result.success).toBe(true);
      expect(result.packageCondition).toBe(RtoPackageCondition.DAMAGED);
      expect(result.restockedLots.length).toBe(0);
      expect(result.quarantinedItems.length).toBe(1);

      // Lot quantityOnHand KHÔNG được tăng (không được đem bán lại)
      expect(mockLots.get(lotId).quantityOnHand).toBe(5);

      // QuarantinedQuantity được tăng thêm 4
      const balance = mockBalances.get(`${locationId}:${variantId}`);
      expect(balance.quarantinedQuantity).toBe(4);
      expect(balance.quantity).toBe(9); // Physical on-hand = 9, Quarantined = 4 => Available = 5 (không tăng bán lẻ!)

      // Outbox event ghi nhận DAMAGED
      expect(mockOutbox[0].payload.packageCondition).toBe('DAMAGED');
    });
  });

  describe('Validation & Error Handling', () => {
    it('Chặn tiếp nhận khi Shipment ở trạng thái không hợp lệ (ví dụ: CREATED)', async () => {
      const shipment = {
        id: 'shipment-created-invalid',
        status: 'CREATED',
      };
      mockShipments.set(shipment.id, shipment);

      await expect(
        service.receiveRtoShipment(shipment.id, { packageCondition: RtoPackageCondition.INTACT }),
      ).rejects.toThrow(BadRequestException);
    });

    it('Ném NotFoundException khi Shipment không tồn tại', async () => {
      await expect(
        service.receiveRtoShipment('unknown-id', { packageCondition: RtoPackageCondition.INTACT }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
