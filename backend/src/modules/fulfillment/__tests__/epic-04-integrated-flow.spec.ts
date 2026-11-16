import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { OUTBOX_WRITER } from '@modules/async-infrastructure';
import { OrderStateAggregator } from '@modules/oms/application/services/order-state-aggregator';
import { PickingService } from '../application/services/picking.service';
import { PackingService } from '../application/services/packing.service';
import { HandoverService } from '../application/services/handover.service';

describe('Epic 04 Integrated Flow: WMS Picking -> Packing -> Handover Lifecycle', () => {
  let pickingService: PickingService;
  let packingService: PackingService;
  let handoverService: HandoverService;
  let prisma: any;
  let outboxWriter: any;
  let orderStateAggregator: any;

  const mockOrderId = 'ord-e2e-001';
  const mockFoId = 'fo-e2e-001';
  const mockVariantId1 = 'var-e2e-001';
  const mockVariantId2 = 'var-e2e-002';
  const mockLotId1 = 'lot-e2e-001';
  const mockLotId2 = 'lot-e2e-002';
  const mockPickerId = 'picker-staff-01';
  const mockPackerId = 'packer-staff-02';
  const mockHandoverStaffId = 'handover-staff-03';

  // State store mimicking DB row
  let foState: any;
  let shipmentState: any;
  let packagesState: any[];
  let outboxEvents: any[];

  beforeEach(async () => {
    outboxEvents = [];
    packagesState = [];
    shipmentState = null;

    foState = {
      id: mockFoId,
      orderId: mockOrderId,
      fulfillmentOrderNumber: 'FO-20261116-E2E',
      sourceLocationId: 'wh-tanbinh-uuid',
      status: 'ALLOCATED',
      shippingServiceCode: 'STANDARD',
      totalItemsCount: 3,
      assignedPickerId: null,
      allocatedAt: new Date('2026-11-16T08:00:00Z'),
      pickedAt: null,
      packedAt: null,
      handedOverAt: null,
      sourceLocation: {
        id: 'wh-tanbinh-uuid',
        name: 'Kho Tổng Tân Bình',
      },
      order: {
        id: mockOrderId,
        orderNumber: 'ORD-20261116-E2E',
        status: 'PROCESSING',
        payments: [
          {
            paymentMethod: 'VNPAY',
            amount: new Prisma.Decimal(750000),
            status: 'SUCCESS',
          },
        ],
      },
      items: [
        {
          id: 'foi-1',
          fulfillmentOrderId: mockFoId,
          orderItemId: 'oi-1',
          productVariantId: mockVariantId1,
          quantityRequested: 2,
          quantityFulfilled: 0,
          variant: {
            sku: 'SKU-SERUM-01',
            barcode: '893600000001',
            product: { name: 'Serum Phục Hồi B5' },
          },
        },
        {
          id: 'foi-2',
          fulfillmentOrderId: mockFoId,
          orderItemId: 'oi-2',
          productVariantId: mockVariantId2,
          quantityRequested: 1,
          quantityFulfilled: 0,
          variant: {
            sku: 'SKU-CREAM-02',
            barcode: '893600000002',
            product: { name: 'Kem Dưỡng Ẩm Ceramide' },
          },
        },
      ],
      reservation: {
        id: 'res-e2e-001',
        fulfillmentOrderId: mockFoId,
        status: 'ALLOCATED',
        items: [
          {
            id: 'ri-1',
            productVariantId: mockVariantId1,
            lotId: mockLotId1,
            quantity: 2,
            lot: {
              batchCode: 'LOT-B5-202610',
              expiryDate: new Date('2027-10-01'),
            },
            variant: {
              sku: 'SKU-SERUM-01',
              barcode: '893600000001',
              product: { name: 'Serum Phục Hồi B5' },
            },
          },
          {
            id: 'ri-2',
            productVariantId: mockVariantId2,
            lotId: mockLotId2,
            quantity: 1,
            lot: {
              batchCode: 'LOT-CRM-202611',
              expiryDate: new Date('2027-11-01'),
            },
            variant: {
              sku: 'SKU-CREAM-02',
              barcode: '893600000002',
              product: { name: 'Kem Dưỡng Ẩm Ceramide' },
            },
          },
        ],
      },
      packages: [],
      shipments: [],
    };

    prisma = {
      fulfillmentOrder: {
        findUnique: jest.fn().mockImplementation(() => {
          return {
            ...foState,
            packages: packagesState,
            shipments: shipmentState ? [shipmentState] : [],
          };
        }),
        update: jest.fn().mockImplementation(({ data }) => {
          Object.assign(foState, data);
          return foState;
        }),
      },
      fulfillmentOrderItem: {
        update: jest.fn().mockImplementation(({ where, data }) => {
          const item = foState.items.find((i: any) => i.id === where.id);
          if (item) Object.assign(item, data);
          return item;
        }),
      },
      package: {
        create: jest.fn().mockImplementation(({ data }) => {
          const pkg = { id: `pkg-${packagesState.length + 1}`, ...data, items: [] };
          packagesState.push(pkg);
          return pkg;
        }),
      },
      packageItem: {
        create: jest.fn().mockImplementation(({ data }) => {
          const pkg = packagesState.find((p) => p.id === data.packageId);
          if (pkg) pkg.items.push(data);
          return { id: `pi-${Date.now()}`, ...data };
        }),
      },
      shipment: {
        create: jest.fn().mockImplementation(({ data }) => {
          shipmentState = {
            id: 'shipment-e2e-001',
            ...data,
            packages: [],
          };
          return shipmentState;
        }),
        update: jest.fn().mockImplementation(({ data }) => {
          Object.assign(shipmentState, data);
          return shipmentState;
        }),
      },
      shipmentPackage: {
        create: jest.fn().mockResolvedValue({ id: 'sp-e2e-001' }),
      },
      $transaction: jest.fn(async (cb) => cb(prisma)),
    };

    outboxWriter = {
      record: jest.fn().mockImplementation(async (_, event) => {
        outboxEvents.push(event);
        return { id: `outbox-${outboxEvents.length}` };
      }),
      recordMany: jest.fn().mockResolvedValue(undefined),
    };

    orderStateAggregator = {
      computeOrderStatus: jest.fn().mockImplementation(async (orderId) => {
        return {
          orderId,
          previousStatus: 'PROCESSING',
          newStatus: 'SHIPPED',
          hasChanged: true,
        };
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PickingService,
        PackingService,
        HandoverService,
        { provide: PrismaService, useValue: prisma },
        { provide: OUTBOX_WRITER, useValue: outboxWriter },
        { provide: OrderStateAggregator, useValue: orderStateAggregator },
      ],
    }).compile();

    pickingService = module.get<PickingService>(PickingService);
    packingService = module.get<PackingService>(PackingService);
    handoverService = module.get<HandoverService>(HandoverService);
  });

  it('phải thực thi trơn tru toàn bộ vòng đời WMS: Nhặt hàng (FEFO) -> Đóng gói (Cân đo) -> Bàn giao (3PL Tracking & Aggregation)', async () => {
    // =========================================================================
    // BƯỚC 1: LẤY DANH SÁCH NHẶT HÀNG (GET PICK LIST)
    // =========================================================================
    const pickList = await pickingService.getPickList(mockFoId);
    expect(pickList.fulfillmentOrderId).toBe(mockFoId);
    expect(pickList.sourceLocationName).toBe('Kho Tổng Tân Bình');
    expect(pickList.items).toHaveLength(2);
    expect(pickList.items[0].batchCode).toBe('LOT-B5-202610');
    expect(pickList.items[0].quantity).toBe(2);
    expect(pickList.items[1].batchCode).toBe('LOT-CRM-202611');
    expect(pickList.items[1].quantity).toBe(1);

    // =========================================================================
    // BƯỚC 2: BẮT ĐẦU NHẶT HÀNG (START PICKING)
    // =========================================================================
    const startRes = await pickingService.startPicking(mockFoId, mockPickerId);
    expect(startRes.success).toBe(true);
    expect(startRes.status).toBe('PICKING');
    expect(startRes.assignedPickerId).toBe(mockPickerId);
    expect(foState.status).toBe('PICKING');

    // =========================================================================
    // BƯỚC 3: HOÀN THÀNH NHẶT HÀNG ĐỐI CHIẾU MÃ LÔ FEFO (COMPLETE PICKING)
    // =========================================================================
    // AC1 Check: Nếu nhân viên kho quét sai mã lô => Bị chặn ngay
    await expect(
      pickingService.completePicking(mockFoId, {
        items: [
          {
            variantId: mockVariantId1,
            batchCode: 'WRONG-BATCH-CODE', // Sai mã lô
            barcode: '893600000001',
            quantity: 2,
          },
          {
            variantId: mockVariantId2,
            batchCode: 'LOT-CRM-202611',
            barcode: '893600000002',
            quantity: 1,
          },
        ],
      }),
    ).rejects.toThrow(/BATCH_MISMATCH/);

    // AC2: Quét đúng 100% mã lô và số lượng => Chuyển sang PICKED
    const completePickRes = await pickingService.completePicking(
      mockFoId,
      {
        items: [
          {
            variantId: mockVariantId1,
            batchCode: 'LOT-B5-202610',
            barcode: '893600000001',
            quantity: 2,
          },
          {
            variantId: mockVariantId2,
            batchCode: 'LOT-CRM-202611',
            barcode: '893600000002',
            quantity: 1,
          },
        ],
      },
      mockPickerId,
    );

    expect(completePickRes.success).toBe(true);
    expect(completePickRes.status).toBe('PICKED');
    expect(foState.status).toBe('PICKED');
    expect(foState.pickedAt).toBeDefined();
    expect(foState.items[0].quantityFulfilled).toBe(2);
    expect(foState.items[1].quantityFulfilled).toBe(1);

    // =========================================================================
    // BƯỚC 4: ĐÓNG GÓI, CÂN ĐO THỰC TẾ & TẠO KIỆN HÀNG (COMPLETE PACKING)
    // =========================================================================
    // AC2 Check: Trọng lượng <= 0 bị từ chối
    await expect(
      packingService.completePacking(mockFoId, {
        packages: [
          {
            actualWeightGrams: 0, // Trọng lượng không hợp lệ
            lengthCm: 20,
            widthCm: 15,
            heightCm: 10,
            items: [{ productVariantId: mockVariantId1, quantity: 2 }],
          },
        ],
      }),
    ).rejects.toThrow(/trọng lượng thực tế/);

    // AC1 & AC2: Đóng gói thành công (2 kiện hàng riêng biệt: 1 chai serum và 1 hộp kem)
    const packRes = await packingService.completePacking(
      mockFoId,
      {
        packages: [
          {
            packageCode: 'PKG-E2E-BOX-1',
            actualWeightGrams: 450,
            lengthCm: 18,
            widthCm: 12,
            heightCm: 8,
            items: [{ productVariantId: mockVariantId1, quantity: 2 }],
          },
          {
            packageCode: 'PKG-E2E-BOX-2',
            actualWeightGrams: 320,
            lengthCm: 15,
            widthCm: 10,
            heightCm: 6,
            items: [{ productVariantId: mockVariantId2, quantity: 1 }],
          },
        ],
      },
      mockPackerId,
    );

    expect(packRes.success).toBe(true);
    expect(packRes.status).toBe('PACKED');
    expect(packRes.totalPackagesCount).toBe(2);
    expect(packRes.carrierCode).toBe('GHN');
    expect(foState.status).toBe('PACKED');
    expect(foState.packedAt).toBeDefined();
    expect(shipmentState.status).toBe('PENDING_CREATION');

    // Kiểm tra Outbox event SHIPMENT_DISPATCH_REQUESTED được ghi nhận
    const dispatchRequestedEvent = outboxEvents.find(
      (e) => e.eventType === 'SHIPMENT_DISPATCH_REQUESTED',
    );
    expect(dispatchRequestedEvent).toBeDefined();
    expect(dispatchRequestedEvent.aggregateId).toBe(mockFoId);
    expect(dispatchRequestedEvent.payload.totalPackages).toBe(2);

    // =========================================================================
    // BƯỚC 5: XÁC NHẬN BÀN GIAO CHO TÀI XẾ (CONFIRM HANDOVER)
    // =========================================================================
    // AC1 Check: Khi chưa có mã vận đơn trackingCode từ 3PL => Bị chặn ngay
    await expect(
      handoverService.confirmHandover(mockFoId, {}, mockHandoverStaffId),
    ).rejects.toThrow(/SHIPMENT_NOT_READY: Kiện hàng chưa có mã vận đơn/);

    // Mô phỏng 3PL cấp mã trackingCode cho Shipment
    shipmentState.trackingCode = 'GHN-VN-888999';

    // AC2: Bàn giao thành công khi đã có mã vận đơn
    const handoverRes = await handoverService.confirmHandover(
      mockFoId,
      {
        driverName: 'Lê Minh Tài',
        driverPhone: '0987654321',
        driverLicensePlate: '59P1-999.88',
        note: 'Bàn giao ca chiều cho bưu tá GHN',
      },
      mockHandoverStaffId,
    );

    expect(handoverRes.success).toBe(true);
    expect(handoverRes.status).toBe('HANDED_OVER');
    expect(handoverRes.trackingCode).toBe('GHN-VN-888999');
    expect(handoverRes.orderStatus).toBe('SHIPPED');
    expect(foState.status).toBe('HANDED_OVER');
    expect(foState.handedOverAt).toBeDefined();
    expect(shipmentState.status).toBe('HANDED_OVER');

    // Kiểm tra gọi OrderStateAggregator
    expect(orderStateAggregator.computeOrderStatus).toHaveBeenCalledWith(
      mockOrderId,
      expect.anything(),
      expect.objectContaining({
        changedBy: mockHandoverStaffId,
      }),
    );

    // Kiểm tra Outbox event FO_HANDED_OVER
    const handedOverEvent = outboxEvents.find(
      (e) => e.eventType === 'FO_HANDED_OVER',
    );
    expect(handedOverEvent).toBeDefined();
    expect(handedOverEvent.payload.driverName).toBe('Lê Minh Tài');
    expect(handedOverEvent.payload.trackingCode).toBe('GHN-VN-888999');

    // =========================================================================
    // BƯỚC 6: KIỂM TRA IDEMPOTENT KHI GỌI LẠI CÁC BƯỚC
    // =========================================================================
    const retryHandover = await handoverService.confirmHandover(
      mockFoId,
      {},
      mockHandoverStaffId,
    );
    expect(retryHandover.success).toBe(true);
    expect(retryHandover.status).toBe('HANDED_OVER');
  });
});
