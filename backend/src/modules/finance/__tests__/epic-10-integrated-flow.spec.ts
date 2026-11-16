import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { OUTBOX_WRITER } from '@modules/async-infrastructure/outbox/outbox-writer.interface';
import { CodManagementService } from '../application/services/cod-management.service';
import { CodReconciliationService } from '../application/services/cod-reconciliation.service';
import { ReconcileBatchDto } from '../presentation/dtos/cod-reconciliation.dto';

describe('EPIC 10 Integrated E2E Flow: COD Lifecycle & Reconciliation Engine', () => {
  let codManagementService: CodManagementService;
  let codReconciliationService: CodReconciliationService;
  let prisma: any;
  let outboxWriter: any;

  beforeEach(async () => {
    prisma = {
      order: {
        findUnique: jest.fn(),
      },
      fulfillmentOrder: {
        findUnique: jest.fn(),
      },
      shipment: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      codReconciliation: {
        findUnique: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      codReconciliationItem: {
        create: jest.fn(),
      },
      $transaction: jest.fn(async (cb) => {
        if (typeof cb === 'function') {
          return cb(prisma);
        }
        return Promise.all(cb);
      }),
    };

    outboxWriter = {
      record: jest.fn().mockResolvedValue({ id: 'outbox-rec-1' }),
      recordMany: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CodManagementService,
        CodReconciliationService,
        { provide: PrismaService, useValue: prisma },
        { provide: OUTBOX_WRITER, useValue: outboxWriter },
      ],
    }).compile();

    codManagementService = module.get<CodManagementService>(CodManagementService);
    codReconciliationService = module.get<CodReconciliationService>(CodReconciliationService);
  });

  it('Khép kín toàn bộ chu trình 4 giai đoạn COD: Split COD Allocation -> Confirmation -> Partner Reconciliation với cả Matched & Discrepancy', async () => {
    // -------------------------------------------------------------
    // GIAI ĐOẠN 1: ĐƠN HÀNG TÁCH KHO & PHÂN BỔ COD THEO TỶ LỆ (EP10-T01)
    // -------------------------------------------------------------
    const orderId = 'ord-split-100';
    const mockOrder = {
      id: orderId,
      orderNumber: 'ORD-SPLIT-100',
      totalAmount: new Prisma.Decimal(500000),
      payments: [
        {
          id: 'pay-cod-1',
          paymentMethod: 'COD',
          status: 'PENDING',
          amount: new Prisma.Decimal(500000),
        },
      ],
      fulfillmentOrders: [
        {
          id: 'fo-tb-1',
          fulfillmentOrderNumber: 'FO-TB-1',
          items: [
            {
              quantityRequested: 1,
              orderItem: { unitPrice: new Prisma.Decimal(300000) },
            },
          ],
        },
        {
          id: 'fo-hn-2',
          fulfillmentOrderNumber: 'FO-HN-2',
          items: [
            {
              quantityRequested: 1,
              orderItem: { unitPrice: new Prisma.Decimal(200000) },
            },
          ],
        },
      ],
    };

    prisma.fulfillmentOrder.findUnique.mockImplementation(({ where }: any) => {
      const fo = mockOrder.fulfillmentOrders.find((f) => f.id === where.id);
      if (!fo) return null;
      return {
        ...fo,
        orderId,
        order: mockOrder,
      };
    });

    const codFo1 = await codManagementService.calculateFulfillmentOrderCod('fo-tb-1');
    const codFo2 = await codManagementService.calculateFulfillmentOrderCod('fo-hn-2');

    expect(codFo1).toBe(300000);
    expect(codFo2).toBe(200000);
    expect(codFo1 + codFo2).toBe(500000);

    // -------------------------------------------------------------
    // GIAI ĐOẠN 2: TẠO VẬN ĐƠN VÀ THU HỘ TIỀN MẶT (COD_EXPECTED -> COD_COLLECTED)
    // -------------------------------------------------------------
    const mockShipment1 = {
      id: 'ship-tb-1',
      orderId,
      fulfillmentOrderId: 'fo-tb-1',
      shipmentCode: 'SHIP-TB-01',
      trackingCode: 'LAD-TB-001',
      carrierCode: 'GHN',
      codAmount: new Prisma.Decimal(300000),
      codStatus: 'COD_EXPECTED',
    };

    const mockShipment2 = {
      id: 'ship-hn-2',
      orderId,
      fulfillmentOrderId: 'fo-hn-2',
      shipmentCode: 'SHIP-HN-02',
      trackingCode: 'LAD-HN-002',
      carrierCode: 'GHN',
      codAmount: new Prisma.Decimal(200000),
      codStatus: 'COD_EXPECTED',
    };

    prisma.shipment.findUnique.mockImplementation(({ where }: any) => {
      if (where.id === 'ship-tb-1') return mockShipment1;
      if (where.id === 'ship-hn-2') return mockShipment2;
      return null;
    });

    prisma.shipment.update.mockImplementation(({ where, data }: any) => {
      if (where.id === 'ship-tb-1') Object.assign(mockShipment1, data);
      if (where.id === 'ship-hn-2') Object.assign(mockShipment2, data);
      return { ...where, ...data };
    });

    // Shipper giao kiện 1 thành công -> thu 300k
    await codManagementService.confirmCodCollected('ship-tb-1');
    expect(mockShipment1.codStatus).toBe('COD_COLLECTED');
    expect(outboxWriter.record).toHaveBeenCalledWith(
      prisma,
      expect.objectContaining({
        eventType: 'COD_COLLECTED_CONFIRMED',
        payload: expect.objectContaining({
          shipmentId: 'ship-tb-1',
          codAmount: 300000,
        }),
      }),
    );

    // Shipper giao kiện 2 thành công -> thu tiền mặt
    await codManagementService.confirmCodCollected('ship-hn-2');
    expect(mockShipment2.codStatus).toBe('COD_COLLECTED');

    // -------------------------------------------------------------
    // GIAI ĐOẠN 3: ĐỐI SOÁT BẢNG KÊ ĐỐI TÁC 3PL (EP10-T02)
    // Kiện 1: Khớp 300k (MATCHED -> SETTLED)
    // Kiện 2: Đối tác chỉ trả 190k (Thiếu 10k -> DISCREPANCY -> SETTLEMENT_DISCREPANCY)
    // -------------------------------------------------------------
    prisma.codReconciliation.findUnique.mockResolvedValue(null);
    prisma.shipment.findMany.mockResolvedValue([mockShipment1, mockShipment2]);

    prisma.codReconciliation.create.mockImplementation(({ data }: any) => ({
      id: 'rec-p0-batch-1',
      ...data,
      createdAt: new Date(),
    }));

    prisma.codReconciliationItem.create.mockImplementation(({ data }: any) => ({
      id: 'rec-item-' + Math.random(),
      ...data,
    }));

    const batchDto: ReconcileBatchDto = {
      reconciliationCode: 'REC-GHN-WEEK46-2026',
      carrierCode: 'GHN',
      reconciliationDate: '2026-11-16',
      bankStatementRef: 'VCB-20261116-8989',
      items: [
        {
          trackingCode: 'LAD-TB-001',
          carrierPaidCodAmount: 300000,
          carrierFeeCharged: 22000,
        },
        {
          trackingCode: 'LAD-HN-002',
          carrierPaidCodAmount: 190000, // Lệch 10k so với 200k
          carrierFeeCharged: 25000,
        },
      ],
    };

    const recResult = await codReconciliationService.reconcileBatch(
      batchDto,
      'finance-admin-user',
    );

    // Kiểm tra kết quả bảng kê
    expect(recResult.status).toBe('DISCREPANCY_FLAGGED');
    expect(recResult.totalCodDeclared).toBe(500000);
    expect(recResult.totalCodReceived).toBe(490000);
    expect(recResult.differenceAmount).toBe(10000);
    expect(recResult.matchedCount).toBe(1);
    expect(recResult.discrepancyCount).toBe(1);

    // Kiểm tra trạng thái Shipment cập nhật chuẩn xác
    expect(mockShipment1.codStatus).toBe('SETTLED');
    expect(mockShipment2.codStatus).toBe('SETTLEMENT_DISCREPANCY');

    // Kiểm tra phát Outbox Event COD_RECONCILIATION_COMPLETED
    expect(outboxWriter.record).toHaveBeenCalledWith(
      prisma,
      expect.objectContaining({
        aggregateType: 'COD_RECONCILIATION',
        eventType: 'COD_RECONCILIATION_COMPLETED',
        payload: expect.objectContaining({
          reconciliationCode: 'REC-GHN-WEEK46-2026',
          status: 'DISCREPANCY_FLAGGED',
          totalCodDeclared: 500000,
          totalCodReceived: 490000,
          differenceAmount: 10000,
          matchedCount: 1,
          discrepancyCount: 1,
        }),
      }),
    );

    // -------------------------------------------------------------
    // GIAI ĐOẠN 4: BÁO CÁO TỔNG QUAN TÀI CHÍNH ĐƠN HÀNG
    // -------------------------------------------------------------
    prisma.order.findUnique.mockResolvedValue({
      id: orderId,
      payments: mockOrder.payments,
      shipments: [mockShipment1, mockShipment2],
    });

    const codSummary = await codManagementService.getCodSummary(orderId);
    expect(codSummary.totalRemainingPayable).toBe(500000);
    expect(codSummary.totalSettled).toBe(300000);
    expect(codSummary.totalDiscrepancy).toBe(200000);
    expect(codSummary.shipments).toHaveLength(2);
  });
});
