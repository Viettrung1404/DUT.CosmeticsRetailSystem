import { PrismaClient } from '@prisma/client';

describe('EP16-T02: Refund Items Migration & Constraint Tests', () => {
  jest.setTimeout(35000);

  let prisma: PrismaClient;
  const testSuffix = Math.random().toString(36).substring(2, 7);

  let testCustomerId: string;
  let testStoreId: string;
  let testCategoryId: string;
  let testProductId: string;
  let testVariantId: string;
  let testOrderId: string;
  let testOrderItemId: string;
  let testRefundId: string;

  beforeAll(async () => {
    prisma = new PrismaClient();
    await prisma.$connect();

    // 1. Seed Store
    const store = await prisma.store.create({
      data: {
        code: `STR-RF-${testSuffix}`.slice(0, 20),
        name: `Showroom Test Refund ${testSuffix}`,
        address: '100 Nguyễn Huệ, Q1, TP. HCM',
        city: 'Hồ Chí Minh',
        district: 'Quận 1',
        phone: '02839999999',
        type: 'STORE',
        isActive: true,
      },
    });
    testStoreId = store.id;

    // 2. Seed Customer
    const customer = await prisma.customer.create({
      data: {
        fullName: `Customer Refund ${testSuffix}`,
        phone: `091${Math.floor(1000000 + Math.random() * 9000000)}`,
      },
    });
    testCustomerId = customer.id;

    // 3. Seed Product & Variant
    const category = await prisma.category.create({
      data: {
        name: `Category Refund ${testSuffix}`,
        slug: `cat-rf-${testSuffix}`,
      },
    });
    testCategoryId = category.id;

    const product = await prisma.product.create({
      data: {
        sku: `PRD-RF-${testSuffix}`,
        name: `Son Dưỡng ${testSuffix}`,
        slug: `son-duong-${testSuffix}`,
        basePrice: 200000,
        categoryId: testCategoryId,
        isActive: true,
      },
    });
    testProductId = product.id;

    const variant = await prisma.productVariant.create({
      data: {
        productId: testProductId,
        sku: `SKU-RF-${testSuffix}`,
        price: 200000,
        costPrice: 90000,
      },
    });
    testVariantId = variant.id;

    // 4. Seed Order
    const order = await prisma.order.create({
      data: {
        orderNumber: `ORD-RF-${testSuffix}`,
        customerId: testCustomerId,
        storeId: testStoreId,
        orderType: 'ONLINE',
        status: 'DELIVERED',
        subtotal: 400000,
        totalAmount: 400000,
        items: {
          create: {
            productVariantId: testVariantId,
            productName: `Son Dưỡng ${testSuffix}`,
            variantName: 'Màu 01',
            quantity: 2,
            unitPrice: 200000,
            unitCost: 90000,
            totalPrice: 400000,
          },
        },
      },
      include: { items: true },
    });
    testOrderId = order.id;
    testOrderItemId = order.items[0].id;

    // 5. Seed Refund
    const refund = await prisma.refund.create({
      data: {
        orderId: testOrderId,
        amount: 200000,
        reason: 'Khách hoàn 1 thỏi son',
        status: 'PENDING',
      },
    });
    testRefundId = refund.id;
  });

  afterAll(async () => {
    if (testRefundId) {
      await prisma.refundItem.deleteMany({ where: { refundId: testRefundId } });
      await prisma.refund.deleteMany({ where: { id: testRefundId } });
    }
    if (testOrderId) {
      await prisma.orderItem.deleteMany({ where: { orderId: testOrderId } });
      await prisma.order.deleteMany({ where: { id: testOrderId } });
    }
    if (testVariantId) {
      await prisma.productVariant.deleteMany({ where: { id: testVariantId } });
    }
    if (testProductId) {
      await prisma.product.deleteMany({ where: { id: testProductId } });
    }
    if (testCategoryId) {
      await prisma.category.deleteMany({ where: { id: testCategoryId } });
    }
    if (testCustomerId) {
      await prisma.customer.deleteMany({ where: { id: testCustomerId } });
    }
    if (testStoreId) {
      await prisma.store.deleteMany({ where: { id: testStoreId } });
    }

    await prisma.$disconnect();
  });

  it('1. should create a valid refund_item linked to refund and order_item', async () => {
    const refundItem = await prisma.refundItem.create({
      data: {
        refundId: testRefundId,
        orderItemId: testOrderItemId,
        quantity: 1,
        amount: 200000,
        pointsRestored: 50,
      },
    });

    expect(refundItem).toBeDefined();
    expect(refundItem.id).toBeDefined();
    expect(Number(refundItem.amount)).toBe(200000);
    expect(refundItem.pointsRestored).toBe(50);
  });

  it('2. should reject negative refund amount via DB check constraint', async () => {
    await expect(
      prisma.refundItem.create({
        data: {
          refundId: testRefundId,
          orderItemId: testOrderItemId,
          quantity: 1,
          amount: -50000, // Negative amount
        },
      }),
    ).rejects.toThrow();
  });

  it('3. should reject non-positive quantity via DB check constraint', async () => {
    await expect(
      prisma.refundItem.create({
        data: {
          refundId: testRefundId,
          orderItemId: testOrderItemId,
          quantity: 0, // Quantity must be > 0
          amount: 100000,
        },
      }),
    ).rejects.toThrow();
  });

  it('4. should reject negative points_restored via DB check constraint', async () => {
    await expect(
      prisma.refundItem.create({
        data: {
          refundId: testRefundId,
          orderItemId: testOrderItemId,
          quantity: 1,
          amount: 100000,
          pointsRestored: -10, // Negative points
        },
      }),
    ).rejects.toThrow();
  });

  it('5. should cascade delete refund_items when refund is deleted', async () => {
    // Create separate refund with refund item
    const tempRefund = await prisma.refund.create({
      data: {
        orderId: testOrderId,
        amount: 100000,
        reason: 'Temporary refund for cascade test',
        status: 'PENDING',
      },
    });

    const item = await prisma.refundItem.create({
      data: {
        refundId: tempRefund.id,
        orderItemId: testOrderItemId,
        quantity: 1,
        amount: 100000,
      },
    });

    // Delete refund
    await prisma.refund.delete({ where: { id: tempRefund.id } });

    // Verify refund_item is deleted
    const foundItem = await prisma.refundItem.findUnique({
      where: { id: item.id },
    });
    expect(foundItem).toBeNull();
  });
});
