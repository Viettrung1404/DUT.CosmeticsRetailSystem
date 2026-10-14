import { randomUUID } from 'crypto';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { cancelReservedOrder } from '@core/services/cancel-reserved-order';
import { PrismaOrderRepository } from '../prisma-order.repository';
import { PrismaAdminOrderRepository } from '../prisma-admin-order.repository';
const integration = process.env.TEST_DATABASE_URL ? describe : describe.skip;
integration(
  'Checkout, reservations and cancellation share a transaction',
  () => {
    let db: PrismaService;
    let repo: PrismaOrderRepository;
    let customer: any;
    let store: any;
    let variants: any[];
    let coupon: any;
    let cart: any;
    beforeAll(async () => {
      const url = new URL(process.env.TEST_DATABASE_URL!);
      if (
        !['localhost', '127.0.0.1'].includes(url.hostname) ||
        !url.pathname.endsWith('_test')
      )
        throw new Error('Dedicated local test DB required');
      process.env.DATABASE_URL = url.toString();
      db = new PrismaService();
      await db.onModuleInit();
      repo = new PrismaOrderRepository(db);
      process.env.MOMO_ENABLED = 'true';
      process.env.MOMO_PARTNER_CODE = 'test';
      process.env.MOMO_ACCESS_KEY = 'test';
      process.env.MOMO_SECRET_KEY = 'test';
      process.env.MOMO_MAX_QPS = '50';
      process.env.PAYMENT_PUBLIC_BASE_URL = 'https://test.example/api/v1';
      process.env.PAYMENT_WEB_RETURN_URL =
        'https://test.example/payment/return';
      await db.role.upsert({
        where: { id: 6 },
        create: { id: 6, name: 'Customer', displayName: 'Customer' },
        update: {},
      });
    });
    beforeEach(async () => {
      const user = await db.user.create({
        data: { email: `${randomUUID()}@test.example`, fullName: 'Test' },
      });
      customer = await db.customer.create({
        data: { userId: user.id, totalPoints: 10 },
      });
      store = await db.store.create({
        data: {
          code: randomUUID().slice(0, 8),
          name: 'Test',
          address: 'Test',
          city: 'Test',
          district: 'Test',
        },
      });
      const category = await db.category.create({
        data: { name: 'Test', slug: randomUUID() },
      });
      const product = await db.product.create({
        data: {
          categoryId: category.id,
          name: 'Test',
          slug: randomUUID(),
          sku: randomUUID(),
          basePrice: 20000,
        },
      });
      variants = [];
      for (let i = 0; i < 2; i++) {
        const variant = await db.productVariant.create({
          data: {
            productId: product.id,
            sku: randomUUID(),
            option1Value: String(i),
            price: 20000,
            costPrice: 10000,
          },
        });
        variants.push(variant);
        await db.inventory.create({
          data: {
            storeId: store.id,
            productVariantId: variant.id,
            quantity: 10,
          },
        });
      }
      coupon = await db.coupon.create({
        data: {
          code: randomUUID(),
          discountType: 'FIXED_AMOUNT',
          discountValue: 1000,
          maxUses: 1,
          maxUsesPerCustomer: 1,
          startDate: new Date(Date.now() - 10000),
          endDate: new Date(Date.now() + 3600000),
        },
      });
      cart = await db.cart.create({
        data: {
          customerId: customer.id,
          items: {
            create: variants.map((v) => ({
              productVariantId: v.id,
              quantity: 1,
              unitPrice: 20000,
            })),
          },
        },
      });
    });
    afterAll(async () => {
      await db.$disconnect();
    });
    const input = (points = 0, withCoupon = false, reverse = false) => ({
      orderNumber: randomUUID(),
      customerId: customer.id,
      storeId: store.id,
      orderType: 'ONLINE',
      subtotal: 40000,
      discountAmount: points * 1000 + (withCoupon ? 1000 : 0),
      shippingFee: 0,
      taxAmount: 0,
      totalAmount: 40000 - points * 1000 - (withCoupon ? 1000 : 0),
      shippingAddress: {
        recipientName: 'Test',
        phone: '0901234567',
        addressLine: 'Test',
        city: 'Test',
      },
      loyaltyPointsUsed: points,
      paymentMethod: 'MOMO',
      couponId: withCoupon ? coupon.id : null,
      cartId: cart.id,
      items: (reverse ? [...variants].reverse() : variants).map((v) => ({
        productVariantId: v.id,
        productName: 'Test',
        variantName: v.sku,
        quantity: 1,
        unitPrice: 20000,
        unitCost: 10000,
        discountAmount: 0,
        totalPrice: 20000,
      })),
    });
    it('rolls back stock, points, coupon, cart, notifications and outbox together', async () => {
      await expect(
        db.transaction(async () => {
          await repo.createOrderWithTransaction(input(10, true));
          throw new Error('Injected after checkout');
        }),
      ).rejects.toThrow('Injected after checkout');
      expect(await db.order.count({ where: { customerId: customer.id } })).toBe(
        0,
      );
      expect(await db.cartItem.count({ where: { cartId: cart.id } })).toBe(2);
      expect(
        (await db.customer.findUniqueOrThrow({ where: { id: customer.id } }))
          .totalPoints,
      ).toBe(10);
      expect(
        (await db.coupon.findUniqueOrThrow({ where: { id: coupon.id } }))
          .usedCount,
      ).toBe(0);
      expect(
        (await db.inventory.findMany({ where: { storeId: store.id } })).every(
          (i) => i.reservedQuantity === 0,
        ),
      ).toBe(true);
      expect(
        await db.notification.count({ where: { userId: customer.userId } }),
      ).toBe(0);
      expect(
        await db.emailOutbox.count({ where: { userId: customer.userId } }),
      ).toBe(0);
    });
    it('prevents two concurrent checkouts from spending the same points', async () => {
      const results = await Promise.allSettled([
        repo.createOrderWithTransaction(input(10)),
        repo.createOrderWithTransaction(input(10, false, true)),
      ]);
      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
      expect(
        (await db.customer.findUniqueOrThrow({ where: { id: customer.id } }))
          .totalPoints,
      ).toBe(0);
    });
    it('serializes the final coupon usage across concurrent checkouts', async () => {
      const results = await Promise.allSettled([
        repo.createOrderWithTransaction(input(0, true)),
        repo.createOrderWithTransaction(input(0, true, true)),
      ]);
      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
      expect(
        (await db.coupon.findUniqueOrThrow({ where: { id: coupon.id } }))
          .usedCount,
      ).toBe(1);
    });
    it('releases multiple reservations and returns points/coupon once under cancellation race', async () => {
      const order = await repo.createOrderWithTransaction(input(10, true));
      const cancel = () =>
        db.transaction(async (tx) => {
          await tx.$queryRaw`SELECT id FROM orders WHERE id=${order.id}::uuid FOR UPDATE`;
          return cancelReservedOrder(tx, order.id, 'Test expiry');
        });
      expect(
        (await Promise.all([cancel(), cancel()])).filter(Boolean),
      ).toHaveLength(1);
      expect(
        (await db.inventory.findMany({ where: { storeId: store.id } })).every(
          (i) => i.reservedQuantity === 0,
        ),
      ).toBe(true);
      expect(
        (await db.customer.findUniqueOrThrow({ where: { id: customer.id } }))
          .totalPoints,
      ).toBe(10);
      expect(
        (await db.coupon.findUniqueOrThrow({ where: { id: coupon.id } }))
          .usedCount,
      ).toBe(0);
      expect(
        await db.loyaltyPointsTransaction.count({
          where: { orderId: order.id, type: 'REFUND' },
        }),
      ).toBe(1);
      expect(
        await db.emailOutbox.count({
          where: { eventKey: `ORDER:${order.id}:CANCELLED` },
        }),
      ).toBe(1);
    });
    it('requires gateway verification before an admin can confirm an online order', async () => {
      const order = await repo.createOrderWithTransaction(input());
      await expect(
        new PrismaAdminOrderRepository(db).confirm({
          orderId: order.id,
          changedBy: customer.userId,
        }),
      ).rejects.toThrow('thanh toán');
      expect(
        (await db.order.findUniqueOrThrow({ where: { id: order.id } })).status,
      ).toBe('PENDING');
    });
    it('admin cancellation releases reservations for a store-pickup checkout', async () => {
      const order = await repo.createOrderWithTransaction({
        ...input(),
        orderType: 'STORE_PICKUP',
      });
      await new PrismaAdminOrderRepository(db).cancelByAdmin({
        orderId: order.id,
        changedBy: customer.userId,
        reason: 'Test pickup cancellation',
      });
      expect(
        (await db.inventory.findMany({ where: { storeId: store.id } })).every(
          (i) => i.reservedQuantity === 0,
        ),
      ).toBe(true);
    });
  },
);
