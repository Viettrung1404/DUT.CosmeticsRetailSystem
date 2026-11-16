import { PrismaClient, Prisma } from '@prisma/client';

describe('CodReconciliation Database Migration & Schema Verification', () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = new PrismaClient();
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('xác minh bảng cod_reconciliations và cod_reconciliation_items tồn tại và nhận dạng chính xác', async () => {
    const recCode = `TEST-REC-${Date.now()}`;

    // 1. Tạo một đơn hàng và Shipment mẫu để làm khóa ngoại
    const store = await prisma.store.findFirst();
    expect(store).toBeDefined();

    const order = await prisma.order.create({
      data: {
        orderNumber: `TEST-ORD-COD-${Date.now()}`,
        storeId: store!.id,
        orderType: 'ONLINE',
        status: 'DELIVERED',
        subtotal: new Prisma.Decimal(300000),
        totalAmount: new Prisma.Decimal(300000),
      },
    });

    const shipment = await prisma.shipment.create({
      data: {
        orderId: order.id,
        shipmentCode: `TEST-SHIP-COD-${Date.now()}`,
        carrierCode: 'GHN',
        trackingCode: `TEST-TRK-${Date.now()}`,
        status: 'DELIVERED',
        codAmount: new Prisma.Decimal(300000),
        codStatus: 'COD_COLLECTED',
      },
    });

    try {
      // 2. Tạo bản ghi bảng kê CodReconciliation
      const rec = await prisma.codReconciliation.create({
        data: {
          reconciliationCode: recCode,
          carrierCode: 'GHN',
          reconciliationDate: new Date('2026-11-16'),
          totalCodDeclared: new Prisma.Decimal(300000),
          totalCodReceived: new Prisma.Decimal(300000),
          differenceAmount: new Prisma.Decimal(0),
          status: 'APPROVED',
        },
      });

      expect(rec.id).toBeDefined();
      expect(rec.status).toBe('APPROVED');

      // 3. Tạo chi tiết bưu kiện CodReconciliationItem
      const item = await prisma.codReconciliationItem.create({
        data: {
          reconciliationId: rec.id,
          shipmentId: shipment.id,
          declaredCodAmount: new Prisma.Decimal(300000),
          carrierPaidCodAmount: new Prisma.Decimal(300000),
          discrepancyAmount: new Prisma.Decimal(0),
          carrierFeeCharged: new Prisma.Decimal(22000),
          status: 'MATCHED',
        },
      });

      expect(item.id).toBeDefined();
      expect(item.reconciliationId).toBe(rec.id);
      expect(item.shipmentId).toBe(shipment.id);

      // 4. Kiểm tra ràng buộc duy nhất trên reconciliation_code (Chặn duplicate)
      await expect(
        prisma.codReconciliation.create({
          data: {
            reconciliationCode: recCode, // Trùng mã
            carrierCode: 'GHN',
            reconciliationDate: new Date('2026-11-16'),
            totalCodDeclared: new Prisma.Decimal(100000),
            totalCodReceived: new Prisma.Decimal(100000),
            differenceAmount: new Prisma.Decimal(0),
            status: 'APPROVED',
          },
        }),
      ).rejects.toThrow();

      // 5. Kiểm tra Cascade Delete: Xóa bảng kê cha thì các dòng con tự động bị xóa
      await prisma.codReconciliation.delete({
        where: { id: rec.id },
      });

      const orphanedItems = await prisma.codReconciliationItem.findMany({
        where: { reconciliationId: rec.id },
      });
      expect(orphanedItems).toHaveLength(0);
    } finally {
      // Dọn dẹp dữ liệu test
      await prisma.shipment.deleteMany({ where: { id: shipment.id } });
      await prisma.order.deleteMany({ where: { id: order.id } });
    }
  });
});
