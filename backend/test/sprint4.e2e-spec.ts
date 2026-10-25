import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { PrismaService } from '../src/infrastructure/database/prisma.service';
import { CustomerCommerceModule } from '../src/modules/customer-commerce/customer-commerce.module';
import { ReturnsService } from '../src/modules/customer-commerce/application/returns.service';
import { LoyaltyService } from '../src/modules/customer-commerce/application/loyalty.service';
import { WishlistService } from '../src/modules/customer-commerce/application/wishlist.service';
import { NotificationsService } from '../src/modules/customer-commerce/application/notifications.service';
import { CustomerCommands } from '../src/modules/customer-commerce/infrastructure/commands';
import { CustomerEventIntegration } from '../src/modules/customer-commerce/application/admin-integration.service';
import { JwtAuthGuard } from '../src/core/guards/jwt-auth.guard';
import { PermissionsModule } from '../src/modules/permissions/permissions.module';
import { AllExceptionsFilter } from '../src/core/filters/http-exception.filter';
import { PrismaOrderRepository } from '../src/modules/orders/infrastructure/repositories/prisma-order.repository';
import { randomUUID } from 'crypto';
import { execFileSync } from 'child_process';
import * as request from 'supertest';
import * as jwt from 'jsonwebtoken';

/** No .env credentials: caller must explicitly supply a disposable local test schema. */
describe('Sprint 4 — PostgreSQL and HTTP', () => {
  let app: INestApplication,
    db: PrismaService,
    returns: ReturnsService,
    loyalty: LoyaltyService,
    wishlist: WishlistService;
  let owner: string,
    customer: string,
    other: string,
    otherCustomer: string,
    store: string,
    product: string,
    variant: string,
    admin: string;
  let token: string, otherToken: string;
  const secret = 'sprint4-test-key-do-not-use-outside-tests';
  beforeAll(async () => {
    const value = process.env.SPRINT4_TEST_DATABASE_URL;
    if (!value)
      throw new Error(
        'SPRINT4_TEST_DATABASE_URL is required; use a disposable local schema named sprint4_*',
      );
    const url = new URL(value);
    if (
      !['localhost', '127.0.0.1'].includes(url.hostname) ||
      !url.searchParams.get('schema')?.startsWith('sprint4_')
    ) {
      throw new Error('Refusing to write outside an explicit local sprint4_* schema');
    }
    process.env.DATABASE_URL = value;
    process.env.JWT_SECRET = secret;
    process.env.NOTIFICATION_DELIVERY_ENABLED = 'false';
    execFileSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy'], {
      env: process.env,
      stdio: 'pipe',
    });
    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
        ThrottlerModule.forRoot([{ ttl: 60000, limit: 1000 }]),
        CustomerCommerceModule,
        PermissionsModule,
      ],
      providers: [{ provide: APP_GUARD, useClass: JwtAuthGuard }],
    }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
    db = module.get(PrismaService);
    returns = module.get(ReturnsService);
    loyalty = module.get(LoyaltyService);
    wishlist = module.get(WishlistService);
    await db.role.upsert({
      where: { id: 6 },
      create: {
        id: 6,
        name: 'Customer',
        displayName: 'Khách hàng',
        dataScope: 'SELF',
      },
      update: {},
    });
    await db.role.upsert({
      where: { id: 1 },
      create: { id: 1, name: 'Admin', displayName: 'Admin', dataScope: 'ALL' },
      update: {},
    });
    admin = (
      await db.user.create({
        data: {
          email: `${randomUUID()}@test.local`,
          fullName: 'Admin',
          roleId: 1,
        },
      })
    ).id;
    owner = randomUUID();
    other = randomUUID();
    const a = await db.user.create({
      data: {
        id: owner,
        email: `${owner}@test.local`,
        fullName: 'Owner',
        roleId: 6,
        emailVerified: true,
        customer: { create: { totalPoints: 100 } },
      },
      include: { customer: true },
    });
    const b = await db.user.create({
      data: {
        id: other,
        email: `${other}@test.local`,
        fullName: 'Other',
        roleId: 6,
        emailVerified: true,
        customer: { create: {} },
      },
      include: { customer: true },
    });
    customer = a.customer!.id;
    otherCustomer = b.customer!.id;
    const ownerSession = await db.userSession.create({
      data: {
        userId: owner,
        refreshToken: randomUUID(),
        expiresAt: new Date(Date.now() + 86400000),
      },
    });
    token = jwt.sign({ userId: owner, sessionId: ownerSession.id }, secret);
    const otherSession = await db.userSession.create({
      data: {
        userId: other,
        refreshToken: randomUUID(),
        expiresAt: new Date(Date.now() + 86400000),
      },
    });
    otherToken = jwt.sign({ userId: other, sessionId: otherSession.id }, secret);
    store = (
      await db.store.create({
        data: {
          name: 'Test',
          code: randomUUID().slice(0, 12),
          address: 'Test',
          city: 'Test',
          district: 'Test',
        },
      })
    ).id;
    const category = await db.category.create({
      data: { name: 'Test', slug: randomUUID() },
    });
    product = (
      await db.product.create({
        data: {
          name: 'Test product',
          slug: randomUUID(),
          sku: randomUUID(),
          categoryId: category.id,
          basePrice: 100000,
        },
      })
    ).id;
    variant = (
      await db.productVariant.create({
        data: {
          productId: product,
          sku: randomUUID(),
          price: 100000,
          costPrice: 50000,
        },
      })
    ).id;
    await db.inventory.create({
      data: { storeId: store, productVariantId: variant, quantity: 100 },
    });
    await db.setting.upsert({
      where: { key: 'return_policy' },
      create: {
        key: 'return_policy',
        value: {
          version: 'test-1',
          allocation: 'PROPORTIONAL',
          refundPointsAs: 'POINTS',
          exchangeShippingFee: 0,
          quoteMinutes: 30,
          allowDifferenceCod: true,
        },
      },
      update: {},
    });
    await db.setting.upsert({
      where: { key: 'loyalty_rewards' },
      create: {
        key: 'loyalty_rewards',
        value: {
          rewards: [
            {
              code: 'TEST',
              version: '1',
              pointsCost: 100,
              discountType: 'FIXED_AMOUNT',
              discountValue: 10000,
              minOrderAmount: 0,
              validityDays: 30,
            },
          ],
        },
      },
      update: {},
    });
  }, 60000);
  afterAll(async () => {
    if (app) await app.close();
  });
  async function order(quantity = 1, completedAt = new Date()) {
    return db.order.create({
      data: {
        orderNumber: randomUUID(),
        customerId: customer,
        storeId: store,
        orderType: 'ONLINE',
        status: 'COMPLETED',
        subtotal: 100000 * quantity,
        totalAmount: 100000 * quantity,
        items: {
          create: {
            productVariantId: variant,
            productName: 'Test',
            variantName: 'Test',
            quantity,
            unitPrice: 100000,
            unitCost: 50000,
            totalPrice: 100000 * quantity,
            pricingSnapshot: {
              version: 1,
              cashValue: 100000 * quantity,
              pointsUsed: 0,
              pointsValue: 0,
              couponDiscount: 0,
            },
          },
        },
        payments: {
          create: {
            paymentMethod: 'COD',
            amount: 100000 * quantity,
            status: 'COMPLETED',
            paidAt: new Date(),
          },
        },
        statusHistories: {
          create: { status: 'COMPLETED', createdAt: completedAt },
        },
      },
      include: { items: true },
    });
  }
  it('requires auth and validates DTO, including forbidden client refund amount', async () => {
    await request(app.getHttpServer()).get('/api/v1/returns').expect(401);
    await request(app.getHttpServer())
      .post('/api/v1/returns')
      .set('Authorization', `Bearer ${token}`)
      .send({
        orderId: randomUUID(),
        type: 'REFUND',
        reason: 'DEFECTIVE',
        items: [],
        refundAmount: 999,
      })
      .expect(400);
  });
  it('creates RMA with a receipt; retry returns same resource and foreign owner sees 404', async () => {
    const original = await order();
    const input = {
      orderId: original.id,
      type: 'REFUND' as const,
      reason: 'DEFECTIVE',
      items: [{ orderItemId: original.items[0].id, quantity: 1 }],
    };
    const [one, two] = await Promise.all([
      returns.create(owner, 'return-retry-1', input),
      returns.create(owner, 'return-retry-1', input),
    ]);
    expect(one.id).toBe(two.id);
    await request(app.getHttpServer())
      .get(`/api/v1/returns/${one.id}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(404);
    await expect(
      returns.create(owner, 'return-retry-1', { ...input, reason: 'EXPIRED' }),
    ).rejects.toThrow('IDEMPOTENCY_PAYLOAD_MISMATCH');
    expect(
      await db.notification.count({
        where: { eventKey: `RETURN:${one.id}:REQUESTED:${owner}` },
      }),
    ).toBe(1);
  });
  it('serializes two requests for the last returnable unit', async () => {
    const original = await order();
    const input = {
      orderId: original.id,
      type: 'REFUND' as const,
      reason: 'DEFECTIVE',
      items: [{ orderItemId: original.items[0].id, quantity: 1 }],
    };
    const outcomes = await Promise.allSettled([
      returns.create(owner, randomUUID(), input),
      returns.create(owner, randomUUID(), input),
    ]);
    expect(outcomes.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
  });
  it('uses COMPLETED history rather than recently updated order time', async () => {
    const original = await order(1, new Date(Date.now() - 8 * 86400000));
    await expect(
      returns.create(owner, randomUUID(), {
        orderId: original.id,
        type: 'REFUND',
        reason: 'DEFECTIVE',
        items: [{ orderItemId: original.items[0].id, quantity: 1 }],
      }),
    ).rejects.toThrow('RETURN_WINDOW_CLOSED');
  });
  it('does not create customer profiles for staff or a user without CRM profile', async () => {
    const user = await db.user.create({
      data: {
        email: `${randomUUID()}@test.local`,
        fullName: 'Unlinked',
        emailVerified: true,
      },
    });
    const session = await db.userSession.create({
      data: {
        userId: user.id,
        refreshToken: randomUUID(),
        expiresAt: new Date(Date.now() + 86400000),
      },
    });
    const auth = jwt.sign({ userId: user.id, sessionId: session.id }, secret);
    await request(app.getHttpServer())
      .get('/api/v1/wishlists')
      .set('Authorization', `Bearer ${auth}`)
      .expect(403);
    expect(await db.customer.count({ where: { userId: user.id } })).toBe(0);
  });
  it('redeem is atomic under concurrent requests and retries do not issue another voucher', async () => {
    const results = await Promise.allSettled([
      loyalty.redeem(owner, 'redemption-first', 'TEST'),
      loyalty.redeem(owner, 'redemption-other', 'TEST'),
    ]);
    const success = results.findIndex((result) => result.status === 'fulfilled');
    expect(success).toBeGreaterThanOrEqual(0);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    const result = (results[success] as PromiseFulfilledResult<any>).value;
    const repeated = await loyalty.redeem(
      owner,
      success === 0 ? 'redemption-first' : 'redemption-other',
      'TEST',
    );
    expect(repeated.coupon.id).toBe(result.coupon.id);
    expect((await db.customer.findUniqueOrThrow({ where: { id: customer } })).totalPoints).toBe(0);
    expect(await db.loyaltyRedemption.count({ where: { customerId: customer } })).toBe(1);
  });
  it('wishlist toggle is idempotent and owner scoped', async () => {
    const [a, b] = await Promise.all([
      wishlist.change(owner, 'wishlist-retry', product),
      wishlist.change(owner, 'wishlist-retry', product),
    ]);
    expect(a).toEqual(b);
    expect(a.isWishlisted).toBe(true);
    expect((await wishlist.list(otherCustomer, 1, 20)).items).toHaveLength(0);
    expect((await wishlist.list(customer, 1, 20)).items[0].isWishlisted).toBe(true);
  });
  it('exchange acceptance reserves stock and creates exactly one replacement order', async () => {
    const original = await order();
    const rma = await returns.create(owner, randomUUID(), {
      orderId: original.id,
      type: 'EXCHANGE',
      reason: 'WRONG_ITEM',
      items: [{ orderItemId: original.items[0].id, quantity: 1 }],
      replacements: [{ productVariantId: variant, quantity: 1 }],
    });
    await db.returnOrder.update({
      where: { id: rma.id },
      data: { status: 'INSPECTED' },
    });
    await db.returnOrderItem.updateMany({
      where: { returnOrderId: rma.id },
      data: { condition: 'RESALEABLE' },
    });
    await db.$transaction((tx) => returns.prepareExchangeQuote(tx, rma.id));
    const outcomes = await Promise.all([
      returns.accept(owner, rma.id, 'accept-exchange-1', { quoteVersion: 1 }),
      returns.accept(owner, rma.id, 'accept-exchange-1', { quoteVersion: 1 }),
    ]);
    expect(outcomes[0].replacementOrderId).toBe(outcomes[1].replacementOrderId);
    const paymentCount = await db.payment.count({
      where: { orderId: outcomes[0].replacementOrderId },
    });
    expect(paymentCount).toBe(0); // Applied credit is not a fabricated payment.
    expect(Number(outcomes[0].settlement.creditApplied)).toBe(100000);
  });
  it('rejects stale quotes without reserving stock', async () => {
    const original = await order();
    const rma = await returns.create(owner, randomUUID(), {
      orderId: original.id,
      type: 'EXCHANGE',
      reason: 'WRONG_ITEM',
      items: [{ orderItemId: original.items[0].id, quantity: 1 }],
      replacements: [{ productVariantId: variant, quantity: 1 }],
    });
    await db.returnOrder.update({
      where: { id: rma.id },
      data: { status: 'INSPECTED' },
    });
    await db.returnOrderItem.updateMany({
      where: { returnOrderId: rma.id },
      data: { condition: 'DAMAGED' },
    });
    await db.$transaction((tx) => returns.prepareExchangeQuote(tx, rma.id));
    await db.productVariant.update({
      where: { id: variant },
      data: { price: 100001 },
    });
    await expect(
      returns.accept(owner, rma.id, randomUUID(), {
        quoteVersion: 1,
        paymentMethod: 'COD',
      }),
    ).rejects.toThrow('QUOTE_PRICE_CHANGED');
    expect(await db.exchangeSettlement.count({ where: { returnOrderId: rma.id } })).toBe(0);
    await db.productVariant.update({
      where: { id: variant },
      data: { price: 100000 },
    });
  });
  it('tracking supports no shipments and never reveals another customer order', async () => {
    const original = await order();
    const ok = await request(app.getHttpServer())
      .get(`/api/v1/orders/${original.id}/tracking`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(ok.body.shipments).toEqual([]);
    await request(app.getHttpServer())
      .get(`/api/v1/orders/${original.id}/tracking`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(404);
  });
  it('reassigns devices without delivering the previous owner notification', async () => {
    const notifications = app.get(NotificationsService);
    const device = await notifications.register(owner, {
      deviceToken: 'test-registration-token',
      platform: 'ANDROID',
    });
    const notification = await db.notification.create({
      data: {
        userId: owner,
        title: 'Private',
        message: 'Private',
        type: 'ORDER',
      },
    });
    await db.pushDelivery.create({
      data: { deviceId: device.id, notificationId: notification.id },
    });
    await notifications.register(other, {
      deviceToken: 'test-registration-token',
      platform: 'ANDROID',
    });
    expect(
      (
        await db.pushDelivery.findFirstOrThrow({
          where: { deviceId: device.id },
        })
      ).status,
    ).toBe('CANCELLED');
  });
  it('rolls back a failed command together with its receipt', async () => {
    const commands = app.get(CustomerCommands);
    await expect(
      commands.execute(owner, 'TEST_ROLLBACK', 'rollback-key-1', {}, async (tx) => {
        await tx.customer.update({
          where: { id: customer },
          data: { totalPoints: { increment: 50 } },
        });
        throw new Error('rollback');
      }),
    ).rejects.toThrow('rollback');
    expect(await db.commandReceipt.count({ where: { operation: 'TEST_ROLLBACK' } })).toBe(0);
    expect((await db.customer.findUniqueOrThrow({ where: { id: customer } })).totalPoints).toBe(0);
  });
  it('handles cheaper/more expensive exchange and compensates cancellation without fake payments', async () => {
    const original = await order();
    const rma = await returns.create(owner, randomUUID(), {
      orderId: original.id,
      type: 'EXCHANGE',
      reason: 'WRONG_ITEM',
      items: [{ orderItemId: original.items[0].id, quantity: 1 }],
      replacements: [{ productVariantId: variant, quantity: 1 }],
    });
    await db.returnOrder.update({
      where: { id: rma.id },
      data: { status: 'INSPECTED' },
    });
    await db.returnOrderItem.updateMany({
      where: { returnOrderId: rma.id },
      data: { condition: 'DAMAGED' },
    });
    await db.productVariant.update({
      where: { id: variant },
      data: { price: 80000 },
    });
    await db.$transaction((tx) => returns.prepareExchangeQuote(tx, rma.id));
    const accepted = await returns.accept(owner, rma.id, randomUUID(), {
      quoteVersion: 1,
    });
    expect(Number(accepted.settlement.refundDue)).toBe(20000);
    expect(await db.refund.findMany({ where: { returnOrderId: rma.id } })).toHaveLength(1);
    const repository = new PrismaOrderRepository(db);
    await repository.cancelOrderWithTransaction(accepted.replacementOrderId, customer);
    const amounts = await db.refund.aggregate({
      where: { returnOrderId: rma.id },
      _sum: { amount: true },
    });
    expect(Number(amounts._sum.amount)).toBe(100000);
    expect(
      (
        await db.exchangeSettlement.findUniqueOrThrow({
          where: { returnOrderId: rma.id },
        })
      ).status,
    ).toBe('CANCELLED');
    await db.productVariant.update({
      where: { id: variant },
      data: { price: 150000 },
    });
    const another = await order();
    const expensive = await returns.create(owner, randomUUID(), {
      orderId: another.id,
      type: 'EXCHANGE',
      reason: 'WRONG_ITEM',
      items: [{ orderItemId: another.items[0].id, quantity: 1 }],
      replacements: [{ productVariantId: variant, quantity: 1 }],
    });
    await db.returnOrder.update({
      where: { id: expensive.id },
      data: { status: 'INSPECTED' },
    });
    await db.returnOrderItem.updateMany({
      where: { returnOrderId: expensive.id },
      data: { condition: 'DAMAGED' },
    });
    await db.$transaction((tx) => returns.prepareExchangeQuote(tx, expensive.id));
    const replacement = await returns.accept(owner, expensive.id, randomUUID(), {
      quoteVersion: 1,
      paymentMethod: 'COD',
    });
    expect(Number(replacement.settlement.additionalDue)).toBe(50000);
    expect(
      Number(
        (
          await db.payment.findFirstOrThrow({
            where: { orderId: replacement.replacementOrderId },
          })
        ).amount,
      ),
    ).toBe(50000);
    await db.productVariant.update({
      where: { id: variant },
      data: { price: 100000 },
    });
  });
  it('serializes checkout points, coupon limits and the last stock unit on real PostgreSQL', async () => {
    const repository = new PrismaOrderRepository(db);
    const input = (cid: string, overrides: any = {}) => ({
      orderNumber: randomUUID(),
      customerId: cid,
      storeId: store,
      orderType: 'ONLINE',
      subtotal: 100000,
      discountAmount: 0,
      shippingFee: 30000,
      taxAmount: 0,
      totalAmount: 130000,
      shippingAddress: {
        recipientName: 'Test',
        phone: '0900000000',
        addressLine: 'Test',
        city: 'Test',
      },
      loyaltyPointsUsed: 0,
      paymentMethod: 'COD',
      couponDiscount: 0,
      pointsDiscount: 0,
      items: [
        {
          productVariantId: variant,
          productName: 'Test',
          variantName: 'Test',
          quantity: 1,
          unitPrice: 100000,
          unitCost: 50000,
          discountAmount: 0,
          totalPrice: 100000,
        },
      ],
      ...overrides,
    });
    await db.setting.upsert({
      where: { key: 'loyalty_config' },
      create: { key: 'loyalty_config', value: { point_value_vnd: 1000 } },
      update: { value: { point_value_vnd: 1000 } },
    });
    await db.customer.update({
      where: { id: customer },
      data: { totalPoints: 100 },
    });
    const points = {
      loyaltyPointsUsed: 100,
      pointsValueVnd: 1000,
      pointsDiscount: 100000,
      discountAmount: 100000,
      totalAmount: 30000,
    };
    const pointResults = await Promise.allSettled([
      repository.createOrderWithTransaction(input(customer, points)),
      repository.createOrderWithTransaction(input(customer, points)),
    ]);
    expect(pointResults.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect((await db.customer.findUniqueOrThrow({ where: { id: customer } })).totalPoints).toBe(0);
    const coupon = await db.coupon.create({
      data: {
        code: randomUUID(),
        discountType: 'FIXED_AMOUNT',
        discountValue: 10000,
        maxUses: 1,
        startDate: new Date(Date.now() - 1000),
        endDate: new Date(Date.now() + 86400000),
      },
    });
    const couponInput = {
      couponId: coupon.id,
      couponDiscount: 10000,
      discountAmount: 10000,
      totalAmount: 120000,
    };
    const couponResults = await Promise.allSettled([
      repository.createOrderWithTransaction(input(customer, couponInput)),
      repository.createOrderWithTransaction(input(otherCustomer, couponInput)),
    ]);
    expect(couponResults.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect((await db.coupon.findUniqueOrThrow({ where: { id: coupon.id } })).usedCount).toBe(1);
    const last = await db.productVariant.create({
      data: {
        productId: product,
        option1Value: 'last',
        sku: randomUUID(),
        price: 100000,
        costPrice: 50000,
      },
    });
    await db.inventory.create({
      data: { storeId: store, productVariantId: last.id, quantity: 1 },
    });
    const lastItem = {
      items: [{ ...input(customer).items[0], productVariantId: last.id }],
    };
    const stockResults = await Promise.allSettled([
      repository.createOrderWithTransaction(input(customer, lastItem)),
      repository.createOrderWithTransaction(input(otherCustomer, lastItem)),
    ]);
    expect(stockResults.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(
      (
        await db.inventory.findUniqueOrThrow({
          where: {
            storeId_productVariantId: {
              storeId: store,
              productVariantId: last.id,
            },
          },
        })
      ).reservedQuantity,
    ).toBe(1);
  });
  it('only emits refund success from a completed original payment and deduplicates provider retry', async () => {
    const original = await order();
    const rma = await returns.create(owner, randomUUID(), {
      orderId: original.id,
      type: 'REFUND',
      reason: 'DEFECTIVE',
      items: [{ orderItemId: original.items[0].id, quantity: 1 }],
    });
    const bridge = app.get(CustomerEventIntegration);
    await db.$transaction((tx) => bridge.reserveRefund(tx, rma.id, 100000));
    const refund = await db.refund.findFirstOrThrow({
      where: { returnOrderId: rma.id },
    });
    await expect(db.$transaction((tx) => bridge.refundCompleted(tx, refund.id))).rejects.toThrow(
      'REFUND_NOT_COMPLETED',
    );
    await db.refund.update({
      where: { id: refund.id },
      data: {
        status: 'COMPLETED',
        processedAt: new Date(),
        refundTransactionId: 'test-provider-result',
      },
    });
    await db.$transaction((tx) => bridge.refundCompleted(tx, refund.id));
    await db.$transaction((tx) => bridge.refundCompleted(tx, refund.id));
    expect(
      await db.notification.count({
        where: { eventKey: `REFUND:${refund.id}:COMPLETED:${owner}` },
      }),
    ).toBe(1);
  });
  it('does not lose points across two fractional partial returns and records a debt if earned points were spent', async () => {
    const original = await order(2);
    await db.order.update({
      where: { id: original.id },
      data: {
        totalAmount: 199000,
        loyaltyPointsUsed: 1,
        pricingSnapshot: { version: 1, pointsValueVnd: 1000 },
      },
    });
    await db.orderItem.update({
      where: { id: original.items[0].id },
      data: {
        totalPrice: 199000,
        pricingSnapshot: {
          version: 1,
          cashValue: 199000,
          pointsValue: 1000,
          pointsUsed: 1,
          couponDiscount: 0,
        },
      },
    });
    await db.loyaltyPointsTransaction.create({
      data: {
        customerId: customer,
        orderId: original.id,
        type: 'EARN',
        points: 199,
      },
    });
    await db.customer.update({
      where: { id: customer },
      data: {
        totalPoints: 0,
        totalSpent: { increment: 199000 },
        totalOrders: { increment: 1 },
      },
    });
    await db.setting.upsert({
      where: { key: 'return_accounting' },
      create: {
        key: 'return_accounting',
        value: {
          earnedPointsReversal: 'PROPORTIONAL',
          allowPointDebt: true,
          stats: 'NET_CASH_VALUE',
          totalOrdersMode: 'REMOVE_FULLY_RETURNED_ORDERS',
        },
      },
      update: {},
    });
    const bridge = app.get(CustomerEventIntegration);
    for (let i = 0; i < 2; i++) {
      const rma = await returns.create(owner, randomUUID(), {
        orderId: original.id,
        type: 'REFUND',
        reason: 'DEFECTIVE',
        items: [{ orderItemId: original.items[0].id, quantity: 1 }],
      });
      await db.returnOrder.update({
        where: { id: rma.id },
        data: { status: 'INSPECTED' },
      });
      await db.returnOrderItem.updateMany({
        where: { returnOrderId: rma.id },
        data: { condition: 'DAMAGED' },
      });
      await db.$transaction((tx) => bridge.reserveRefund(tx, rma.id, 99500));
      await db.refund.updateMany({
        where: { returnOrderId: rma.id },
        data: { status: 'COMPLETED', processedAt: new Date() },
      });
      await db.$transaction((tx) => bridge.completeReturn(tx, rma.id, admin));
      await db.$transaction((tx) => bridge.completeReturn(tx, rma.id, admin));
    }
    const restored = await db.returnOrderItem.aggregate({
      where: { returnOrder: { orderId: original.id } },
      _sum: { pointsToRestore: true },
    });
    expect(restored._sum.pointsToRestore).toBe(1);
    expect((await db.customer.findUniqueOrThrow({ where: { id: customer } })).totalPoints).toBe(
      -198,
    );
  });
  it('traces replacement returns to real source payments without minting credit', async () => {
    const original = await order();
    const rma = await returns.create(owner, randomUUID(), {
      orderId: original.id,
      type: 'EXCHANGE',
      reason: 'WRONG_ITEM',
      items: [{ orderItemId: original.items[0].id, quantity: 1 }],
      replacements: [{ productVariantId: variant, quantity: 1 }],
    });
    await db.returnOrder.update({
      where: { id: rma.id },
      data: { status: 'INSPECTED' },
    });
    await db.returnOrderItem.updateMany({
      where: { returnOrderId: rma.id },
      data: { condition: 'DAMAGED' },
    });
    await db.$transaction((tx) => returns.prepareExchangeQuote(tx, rma.id));
    const accepted = await returns.accept(owner, rma.id, randomUUID(), {
      quoteVersion: 1,
    });
    const bridge = app.get(CustomerEventIntegration);
    await expect(db.$transaction((tx) => bridge.reserveRefund(tx, rma.id, 100000))).rejects.toThrow(
      'REFUND_EXCEEDS_AVAILABLE_PAYMENTS',
    );
    const replacement = await db.order.update({
      where: { id: accepted.replacementOrderId },
      data: {
        status: 'COMPLETED',
        statusHistories: { create: { status: 'COMPLETED' } },
      },
      include: { items: true },
    });
    const second = await returns.create(owner, randomUUID(), {
      orderId: replacement.id,
      type: 'REFUND',
      reason: 'DEFECTIVE',
      items: [{ orderItemId: replacement.items[0].id, quantity: 1 }],
    });
    await db.$transaction((tx) => bridge.reserveRefund(tx, second.id, 100000));
    const refunds = await db.refund.findMany({
      where: { returnOrderId: second.id },
      include: { payment: true },
    });
    expect(refunds).toHaveLength(1);
    expect(refunds[0].payment!.orderId).toBe(original.id);
    expect(Number(refunds[0].amount)).toBe(100000);
    expect(await db.payment.count({ where: { orderId: replacement.id } })).toBe(0);
  });
  it('preserves handwritten inventory invariants after the new migration', async () => {
    const columns = await db.$queryRaw<
      { is_generated: string }[]
    >`SELECT is_generated FROM information_schema.columns
      WHERE table_schema=current_schema() AND table_name='inventory' AND column_name='available_quantity'`;
    expect(columns[0].is_generated).toBe('ALWAYS');
    await expect(
      db.inventory.update({
        where: {
          storeId_productVariantId: {
            storeId: store,
            productVariantId: variant,
          },
        },
        data: { reservedQuantity: 100000 },
      }),
    ).rejects.toThrow();
  });
  it('wires the complete application and documents the real routes without contacting providers', async () => {
    const { AppModule } = await import('../src/app.module');
    const { ElasticsearchProductService } =
      await import('../src/modules/products/infrastructure/search/elasticsearch-product.service');
    const { NotificationWorker } =
      await import('../src/modules/customer-commerce/infrastructure/notification.worker');
    const { ReturnImageStorage } =
      await import('../src/modules/customer-commerce/infrastructure/return-image.storage');
    const { S3FileStorageService } =
      await import('../src/modules/uploads/infrastructure/adapters/s3-file-storage.service');
    const { SwaggerModule, DocumentBuilder } = await import('@nestjs/swagger');
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ElasticsearchProductService)
      .useValue({ isAvailable: false })
      .overrideProvider(NotificationWorker)
      .useValue({})
      .overrideProvider(ReturnImageStorage)
      .useValue({})
      .overrideProvider(S3FileStorageService)
      .useValue({})
      .compile();
    const application = module.createNestApplication();
    application.setGlobalPrefix('api/v1');
    try {
      const spec = SwaggerModule.createDocument(
        application,
        new DocumentBuilder().setTitle('Sprint 4').setVersion('1').build(),
      );
      expect(spec.paths['/api/v1/returns'].post).toBeDefined();
      expect(spec.paths['/api/v1/orders/{id}/tracking'].get).toBeDefined();
      expect(spec.paths['/api/v1/customer/products'].get).toBeDefined();
    } finally {
      await application.close();
    }
  });
});
