import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD } from '@nestjs/core';
import { randomUUID, createHmac } from 'crypto';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import request = require('supertest');
import * as jwt from 'jsonwebtoken';
import { Customer, Order, Payment, ProductVariant } from '@prisma/client';
import { PrismaModule } from '@infrastructure/database/prisma.module';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { JwtAuthGuard } from '@core/guards/jwt-auth.guard';
import { PaymentsModule } from '../../../payments.module';
import { PAYMENT_GATEWAYS } from '../../../application/services/payments.service';
import { GatewayAdapter } from '../../../infrastructure/gateways/gateway-adapters';
import { PaymentWorker } from '../../../infrastructure/workers/payment-worker';
import { PrismaOrderRepository } from '@modules/orders/infrastructure/repositories/prisma-order.repository';
const load =
  process.env.RUN_SPRINT3_LOAD === 'true' && process.env.TEST_DATABASE_URL
    ? describe
    : describe.skip;
load('50-user mixed payment load with simulated gateway latency', () => {
  let app: INestApplication;
  let db: PrismaService;
  let worker: PaymentWorker;
  beforeAll(async () => {
    const url = new URL(process.env.TEST_DATABASE_URL!);
    const name = decodeURIComponent(url.pathname.slice(1));
    const local =
      ['localhost', '127.0.0.1'].includes(url.hostname) &&
      name.endsWith('_load_test');
    const neon =
      url.hostname.endsWith('.neon.tech') &&
      /^glowup_sprint3_[0-9a-f]{12}_load_test$/.test(name) &&
      process.env.SPRINT3_ISOLATED_NEON_DATABASE === name &&
      /^[0-9a-f]{32}$/.test(process.env.SPRINT3_NEON_OWNERSHIP_TOKEN || '');
    if (!local && !neon)
      throw new Error(
        'Use a dedicated local database or the isolated Neon load runner',
      );
    process.env.DATABASE_URL = url.toString();
    process.env.JWT_SECRET = 'load-test-secret';
    process.env.MOMO_PARTNER_CODE = 'load';
    process.env.MOMO_ACCESS_KEY = 'access';
    process.env.MOMO_SECRET_KEY = 'secret';
    // Fixture creation time is excluded from payment deadlines and worker load.
    process.env.PAYMENT_WORKER_ENABLED = 'false';
    const module = await Test.createTestingModule({
      imports: [
        ScheduleModule.forRoot(),
        ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
        PrismaModule,
        PaymentsModule,
      ],
      providers: [{ provide: APP_GUARD, useClass: JwtAuthGuard }],
    }).compile();
    app = module.createNestApplication({ rawBody: true });
    app.setGlobalPrefix('api/v1');
    await app.init();
    db = module.get(PrismaService);
    if (neon) {
      const [ownership] = await db.$queryRaw<Array<{ marker: string | null }>>`
        SELECT shobj_description(oid,'pg_database') AS marker
        FROM pg_database WHERE datname=current_database()`;
      if (
        ownership?.marker !==
        `sprint3-load:${process.env.SPRINT3_NEON_OWNERSHIP_TOKEN}`
      )
        throw new Error('Neon load database ownership marker does not match');
    }
    worker = module.get(PaymentWorker);
    const gateways =
      module.get<Record<string, GatewayAdapter>>(PAYMENT_GATEWAYS);
    gateways.MOMO.query = async (a) => {
      const index = Number(a.requestId);
      await new Promise((resolve) =>
        setTimeout(resolve, index % 2 ? 30000 : 10000),
      );
      return {
        gateway: 'MOMO',
        merchantReference: a.merchantReference,
        transactionId: a.merchantReference,
        amount: a.amount,
        state: 'PAID',
        code: '0',
        subCode: '',
        kind: 'PAYMENT',
        payload: {},
      };
    };
    await db.role.upsert({
      where: { id: 6 },
      create: { id: 6, name: 'Customer', displayName: 'Customer' },
      update: {},
    });
    // Prior evidence rows from an earlier load run must not consume this run's slots.
    await db.payment.updateMany({ data: { nextQueryAt: null } });
  });
  afterAll(async () => {
    await worker?.onModuleDestroy();
    await app?.close();
  });
  it('ACKs callbacks promptly and does not refund timely payments because of an internal query queue', async () => {
    const store = await db.store.create({
      data: {
        code: randomUUID().slice(0, 8),
        name: 'Load',
        address: 'Test',
        city: 'Test',
        district: 'Test',
      },
    });
    const category = await db.category.create({
      data: { name: 'Load', slug: randomUUID() },
    });
    const product = await db.product.create({
      data: {
        categoryId: category.id,
        name: 'Load',
        slug: randomUUID(),
        sku: randomUUID(),
        basePrice: 1000,
      },
    });
    const variants: ProductVariant[] = [];
    for (let i = 0; i < 5; i++) {
      const variant = await db.productVariant.create({
        data: {
          productId: product.id,
          sku: randomUUID(),
          option1Value: String(i),
          price: 1000,
          costPrice: 500,
        },
      });
      variants.push(variant);
      await db.inventory.create({
        data: {
          storeId: store.id,
          productVariantId: variant.id,
          quantity: 1000,
          reservedQuantity: 55,
        },
      });
    }
    const fixtures: Array<{
      order: Order;
      customer: Customer;
      payment: Payment;
      token: string;
      body: string;
    }> = [];
    const seed = BigInt(Date.now()) * 1000000n;
    for (let index = 0; index < 50; index++) {
      const user = await db.user.create({
        data: { email: `${randomUUID()}@load.example`, fullName: 'Load' },
      });
      const customer = await db.customer.create({ data: { userId: user.id } });
      const createdAt = new Date();
      const order = await db.order.create({
        data: {
          orderNumber: randomUUID(),
          storeId: store.id,
          customerId: customer.id,
          status: 'PENDING',
          orderType: 'ONLINE',
          subtotal: 5000,
          totalAmount: 5000,
          createdAt,
          items: {
            create: variants.map((v) => ({
              productVariantId: v.id,
              productName: 'Load',
              variantName: v.sku,
              quantity: 1,
              unitPrice: 1000,
              unitCost: 500,
              totalPrice: 1000,
            })),
          },
        },
      });
      const txn = String(seed + BigInt(index));
      const payment = await db.payment.create({
        data: {
          orderId: order.id,
          merchantReference: txn,
          requestId: String(index),
          paymentMethod: 'MOMO',
          amount: 5000,
          status: 'PAYABLE',
          expiresAt: new Date(createdAt.getTime() + 900000),
          recoveryUntil: new Date(Date.now() + 86400000),
        },
      });
      const payload = {
        partnerCode: 'load',
        orderId: txn,
        requestId: String(index),
        amount: '5000',
        orderInfo: 'Load',
        orderType: 'momo_wallet',
        transId: txn,
        resultCode: '0',
        message: 'Success',
        payType: 'qr',
        responseTime: '1',
        extraData: '',
      };
      const signed = { accessKey: 'access', ...payload };
      const keys = [
        'accessKey',
        'amount',
        'extraData',
        'message',
        'orderId',
        'orderInfo',
        'orderType',
        'partnerCode',
        'payType',
        'requestId',
        'responseTime',
        'resultCode',
        'transId',
      ];
      const signature = createHmac('sha256', 'secret')
        .update(keys.map((k) => `${k}=${signed[k]}`).join('&'))
        .digest('hex');
      const token = jwt.sign(
        {
          userId: user.id,
          roleId: 6,
          roleName: 'Customer',
          permissionCodes: [],
          dataScope: 'SELF',
        },
        'load-test-secret',
      );
      fixtures.push({
        order,
        customer,
        payment,
        token,
        body: JSON.stringify({ ...payload, signature }).replace(
          `"transId":"${txn}"`,
          `"transId":${txn}`,
        ),
      });
    }
    const expiredIds: string[] = [];
    for (let i = 0; i < 5; i++) {
      const order = await db.order.create({
        data: {
          orderNumber: randomUUID(),
          storeId: store.id,
          customerId: fixtures[i].customer.id,
          status: 'PENDING',
          orderType: 'ONLINE',
          subtotal: 5000,
          totalAmount: 5000,
          createdAt: new Date(Date.now() - 960000),
          items: {
            create: variants.map((v) => ({
              productVariantId: v.id,
              productName: 'Load',
              variantName: v.sku,
              quantity: 1,
              unitPrice: 1000,
              unitCost: 500,
              totalPrice: 1000,
            })),
          },
          payments: {
            create: { paymentMethod: 'MOMO', amount: 5000, status: 'PENDING' },
          },
        },
      });
      expiredIds.push(order.id);
    }
    // Use one DB timestamp for the whole paid cohort, after slow remote seeding.
    const ids = fixtures.map((f) => f.order.id);
    await db.$executeRaw`WITH stamp AS (SELECT clock_timestamp() AS now)
      UPDATE orders SET created_at=stamp.now-interval '890 seconds'
      FROM stamp WHERE id=ANY(${ids}::uuid[])`;
    await db.$executeRaw`UPDATE payments p SET expires_at=o.created_at+interval '15 minutes'
      FROM orders o WHERE p.order_id=o.id AND o.id=ANY(${ids}::uuid[])`;
    process.env.PAYMENT_WORKER_ENABLED = 'true';
    const started = Date.now();
    const callbackStatuses: number[] = [];
    const successfulAckMs: number[] = [];
    const callback = async (f: (typeof fixtures)[number]) => {
      const begin = Date.now();
      const response = await request(app.getHttpServer())
        .post('/api/v1/payments/momo/ipn')
        .set('Content-Type', 'application/json')
        .send(f.body);
      callbackStatuses.push(response.status);
      const elapsed = Date.now() - begin;
      if (response.status === 204) successfulAckMs.push(elapsed);
      return elapsed;
    };
    const ackMs = await Promise.all(fixtures.map(callback));
    await worker.tick();
    // Five explicit customer cancellations race with query and release five multi-item reservations.
    const cancels = Promise.allSettled(
      fixtures
        .slice(0, 5)
        .map((f) =>
          new PrismaOrderRepository(db).cancelOrderWithTransaction(
            f.order.id,
            f.customer.id,
          ),
        ),
    );
    for (let i = 0; i < 3; i++) {
      await Promise.all([
        ...fixtures.map((f) =>
          request(app.getHttpServer())
            .get(`/api/v1/payments/${f.payment.id}/status`)
            .auth(f.token, { type: 'bearer' })
            .expect(200),
        ),
        ...fixtures.slice(0, 10).map(async (f) => {
          ackMs.push(await callback(f));
        }),
      ]);
      await worker.tick();
    }
    const cancellationResults = await cancels;
    // Keep scheduled polling alive until the cohort settles or its fixed grace
    // has ended. Shutdown must not stop recovery at the first 30s query result.
    while (Date.now() - started < 75_000) {
      const pending = await db.order.count({
        where: {
          id: { in: [...ids, ...expiredIds] },
          status: 'PENDING',
        },
      });
      if (!pending) break;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    await worker.onModuleDestroy();
    const confirmed = await db.order.count({
      where: { id: { in: ids }, status: 'CONFIRMED' },
    });
    const cancelled = await db.order.count({
      where: { id: { in: ids }, status: 'CANCELLED' },
    });
    const refunds = await db.refund.count({ where: { orderId: { in: ids } } });
    const expiredUnpaid = await db.order.count({
      where: { id: { in: expiredIds }, status: 'CANCELLED' },
    });
    const ordered = ackMs.sort((a, b) => a - b);
    const p95 = ordered[Math.ceil(ordered.length * 0.95) - 1];
    successfulAckMs.sort((a, b) => a - b);
    const evidence = {
      at: new Date().toISOString(),
      environment: process.env.SPRINT3_ISOLATED_NEON_DATABASE
        ? 'isolated Neon database; backend on developer machine, pool 20; simulated gateway queries'
        : 'local PostgreSQL 17, pool 20; simulated gateway queries',
      users: 50,
      itemsPerOrder: 5,
      queryDelayMs: [10000, 30000],
      ackP95Ms: p95,
      successfulAckP95Ms: successfulAckMs.length
        ? successfulAckMs[Math.ceil(successfulAckMs.length * 0.95) - 1]
        : null,
      ackMaxMs: ordered[ordered.length - 1],
      durationMs: Date.now() - started,
      confirmed,
      cancelled,
      refunds,
      explicitCustomerCancellations: 5,
      cancellationFailures: cancellationResults.filter(
        (r) => r.status === 'rejected',
      ).length,
      expiredUnpaid,
      callbacksMeasured: ackMs.length,
      callbacksAcknowledged: callbackStatuses.filter((s) => s === 204).length,
      callbackFailures: callbackStatuses.filter((s) => s !== 204).length,
      unexpectedRefunds: refunds - 5,
      neonAcceptance:
        !!process.env.SPRINT3_ISOLATED_NEON_DATABASE &&
        p95 < 1000 &&
        callbackStatuses.every((s) => s === 204) &&
        confirmed === 45 &&
        cancelled === 5 &&
        refunds === 5 &&
        expiredUnpaid === 5,
    };
    const dir = join(process.cwd(), 'docs', 'evidence');
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(
        dir,
        process.env.SPRINT3_ISOLATED_NEON_DATABASE
          ? 'neon-load.json'
          : 'local-load.json',
      ),
      JSON.stringify(evidence, null, 2) + '\n',
    );
    expect(p95).toBeLessThan(1000);
    expect(callbackStatuses.every((s) => s === 204)).toBe(true);
    expect(cancellationResults.every((r) => r.status === 'fulfilled')).toBe(
      true,
    );
    expect(confirmed).toBe(45);
    expect(cancelled).toBe(5);
    expect(refunds).toBe(5);
    expect(expiredUnpaid).toBe(5);
    expect(
      (await db.inventory.findMany({ where: { storeId: store.id } })).every(
        (i) => i.reservedQuantity === 45,
      ),
    ).toBe(true);
  }, 180000);
});
