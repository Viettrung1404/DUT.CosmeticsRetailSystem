import { PrismaService } from '@infrastructure/database/prisma.service';
import { randomUUID } from 'crypto';
import { PaymentsService } from '../payments.service';
import {
  GatewayAdapter,
  Observation,
} from '../../../infrastructure/gateways/gateway-adapters';
import { PrismaOrderRepository } from '@modules/orders/infrastructure/repositories/prisma-order.repository';
import { PaymentWorker } from '../../../infrastructure/workers/payment-worker';
import { PrismaAdminOrderRepository } from '@modules/orders/infrastructure/repositories/prisma-admin-order.repository';
import { GatewayCallNotStartedError } from '../../../domain/gateway-call-not-started.error';

const testUrl = process.env.TEST_DATABASE_URL;
const integration = testUrl ? describe : describe.skip;
integration('Payment transactions on isolated PostgreSQL', () => {
  let db: PrismaService;
  let service: PaymentsService;
  let user: any;
  let customer: any;
  let store: any;
  const adapter: GatewayAdapter = {
    method: 'MOMO',
    prepare: (a) => ({ orderId: a.merchantReference }),
    create: async () => ({
      status: 'PAYABLE',
      paymentUrl: 'https://test.example/pay',
      walletDeeplink: 'momo://test',
      qrCodeData: null,
      payload: {},
    }),
    callback: () => {
      throw new Error('Use signed adapter tests');
    },
    query: jest.fn(),
  };
  beforeAll(async () => {
    const url = new URL(testUrl!);
    if (
      !['localhost', '127.0.0.1'].includes(url.hostname) ||
      !url.pathname.endsWith('_test')
    )
      throw new Error('Tests require a dedicated local _test database');
    process.env.DATABASE_URL = testUrl;
    process.env.PAYMENT_PUBLIC_BASE_URL = 'https://test.example/api/v1';
    process.env.PAYMENT_WEB_RETURN_URL = 'https://test.example/payment/return';
    process.env.MOMO_ENABLED = 'true';
    process.env.MOMO_PARTNER_CODE = 'test';
    process.env.MOMO_ACCESS_KEY = 'test';
    process.env.MOMO_SECRET_KEY = 'test';
    process.env.MOMO_MAX_QPS = '50';
    db = new PrismaService();
    await db.$connect();
    await Promise.all(
      Array.from(
        { length: 20 },
        () => db.$queryRaw`SELECT pg_sleep(0.1)::text`,
      ),
    );
    // Retire schedules from earlier runs of this dedicated fixture database.
    await db.payment.updateMany({ data: { nextQueryAt: null } });
    await db.role.upsert({
      where: { id: 6 },
      create: { id: 6, name: 'Customer', displayName: 'Customer' },
      update: {},
    });
    user = await db.user.create({
      data: {
        email: `${randomUUID()}@test.example`,
        fullName: 'Test customer',
        emailVerified: true,
      },
    });
    customer = await db.customer.create({ data: { userId: user.id } });
    store = await db.store.create({
      data: {
        code: randomUUID().slice(0, 8),
        name: 'Test',
        address: 'Test',
        city: 'Test',
        district: 'Test',
      },
    });
    service = new PaymentsService(db, {
      MOMO: adapter,
      VNPAY: { ...adapter, method: 'VNPAY' },
      ZALOPAY: { ...adapter, method: 'ZALOPAY' },
    });
  });
  afterAll(async () => {
    if (db) await db.$disconnect();
  });
  async function fixture(age = 0) {
    const order = await db.order.create({
      data: {
        orderNumber: randomUUID(),
        customerId: customer.id,
        storeId: store.id,
        orderType: 'ONLINE',
        status: 'PENDING',
        subtotal: 5000,
        totalAmount: 5000,
        createdAt: new Date(Date.now() - age),
      },
    });
    await db.payment.create({
      data: {
        orderId: order.id,
        paymentMethod: 'MOMO',
        amount: 5000,
        status: 'PENDING',
      },
    });
    const result = await service.create(user.id, 'MOMO', order.id, 'MOBILE');
    const payment = await db.payment.findUniqueOrThrow({
      where: { id: result.paymentId },
    });
    return { order, payment };
  }
  const paid = (
    p: any,
    txn = String(
      9007199254740993n + BigInt('0x' + p.id.replace(/-/g, '').slice(0, 8)),
    ),
  ): Observation => ({
    gateway: 'MOMO',
    merchantReference: p.merchantReference,
    transactionId: txn,
    amount: 5000,
    state: 'PAID',
    code: '0',
    subCode: '',
    kind: 'PAYMENT',
    payload: {},
  });
  it('retries transient apply contention without querying a slow gateway a second time', async () => {
    const { order, payment } = await fixture();
    await service.receive(paid(payment));
    (adapter.query as jest.Mock).mockClear().mockResolvedValue(paid(payment));
    const transaction = jest.spyOn(db, 'transaction').mockRejectedValueOnce({
      code: 'P2010',
      meta: { code: '55P03' },
    });
    try {
      await service.process(payment.id);
      expect(adapter.query).toHaveBeenCalledTimes(1);
      expect(
        (await db.order.findUniqueOrThrow({ where: { id: order.id } })).status,
      ).toBe('CONFIRMED');
      expect(await db.refund.count({ where: { paymentId: payment.id } })).toBe(
        0,
      );
    } finally {
      transaction.mockRestore();
    }
  });
  it('reuses the checkout payment and its initial platform/deadline under concurrent creation', async () => {
    const { order, payment } = await fixture();
    const replies = await Promise.all(
      Array.from({ length: 8 }, () =>
        service.create(user.id, 'MOMO', order.id, 'WEB'),
      ),
    );
    expect(new Set(replies.map((r) => r.paymentId))).toEqual(
      new Set([payment.id]),
    );
    expect(replies.every((r) => r.returnUrl === payment.returnUrl)).toBe(true);
    expect(await db.payment.count({ where: { orderId: order.id } })).toBe(1);
  });
  it('preserves urgent paid evidence when callback arrives before create response', async () => {
    const order = await db.order.create({
      data: {
        orderNumber: randomUUID(),
        customerId: customer.id,
        storeId: store.id,
        orderType: 'ONLINE',
        status: 'PENDING',
        subtotal: 5000,
        totalAmount: 5000,
      },
    });
    const initial = await db.payment.create({
      data: {
        orderId: order.id,
        paymentMethod: 'MOMO',
        amount: 5000,
        status: 'PENDING',
      },
    });
    let release!: () => void;
    let started!: () => void;
    const ready = new Promise<void>((r) => (started = r));
    const gate = new Promise<void>((r) => (release = r));
    const previous = adapter.create;
    adapter.create = async () => {
      started();
      await gate;
      return {
        status: 'PAYABLE',
        paymentUrl: 'https://test.example/pay',
        walletDeeplink: null,
        qrCodeData: null,
        payload: {},
      };
    };
    try {
      const creating = service.create(user.id, 'MOMO', order.id);
      await ready;
      const p = await db.payment.findUniqueOrThrow({
        where: { id: initial.id },
      });
      await service.receive(paid(p));
      release();
      await creating;
      const after = await db.payment.findUniqueOrThrow({ where: { id: p.id } });
      expect(after.verificationPending).toBe(true);
      expect(after.firstPaidReceivedAt).not.toBeNull();
    } finally {
      release();
      adapter.create = previous;
    }
  });
  it('rejects reuse after the original order payment deadline', async () => {
    const { order } = await fixture();
    await db.$executeRaw`UPDATE orders SET created_at=clock_timestamp()-interval '901 seconds' WHERE id=${order.id}::uuid`;
    await expect(service.create(user.id, 'MOMO', order.id)).rejects.toThrow(
      'hết hạn',
    );
  });
  it('allows a new attempt after local quota rejection with proof no outbound occurred', async () => {
    const original = adapter.create;
    let first: Awaited<ReturnType<typeof fixture>>;
    adapter.create = async () => {
      throw new GatewayCallNotStartedError();
    };
    try {
      first = await fixture();
      expect(first.payment.status).toBe('FAILED');
    } finally {
      adapter.create = original;
    }
    const retried = await service.create(user.id, 'MOMO', first!.order.id);
    expect(retried.paymentId).not.toBe(first!.payment.id);
    expect(retried.expiresAt).toEqual(first!.payment.expiresAt);
  });
  it('commits a deduplicated paid inbox without confirming the order until query', async () => {
    const { order, payment } = await fixture();
    expect(await service.receive(paid(payment))).toBe(false);
    const first = await db.payment.findUniqueOrThrow({
      where: { id: payment.id },
    });
    expect(await service.receive(paid(payment))).toBe(true);
    expect(
      (await db.payment.findUniqueOrThrow({ where: { id: payment.id } }))
        .firstPaidReceivedAt,
    ).toEqual(first.firstPaidReceivedAt);
    expect(
      await db.paymentWebhookInbox.count({ where: { paymentId: payment.id } }),
    ).toBe(1);
    expect(
      (await db.order.findUniqueOrThrow({ where: { id: order.id } })).status,
    ).toBe('PENDING');
    (adapter.query as jest.Mock).mockResolvedValue(paid(payment));
    await service.process(payment.id);
    expect(
      (await db.order.findUniqueOrThrow({ where: { id: order.id } })).status,
    ).toBe('CONFIRMED');
    expect(
      await db.emailOutbox.count({
        where: { eventKey: `ORDER:${order.id}:CONFIRMED` },
      }),
    ).toBe(1);
  });
  it('rejects mismatched amount without a durable receipt', async () => {
    const { payment } = await fixture();
    await expect(
      service.receive({ ...paid(payment), amount: 5001 }),
    ).rejects.toThrow();
    expect(
      await db.paymentWebhookInbox.count({ where: { paymentId: payment.id } }),
    ).toBe(0);
  });
  it('preserves CANCELLED orders and creates exactly one refund for a late verified charge', async () => {
    const { order, payment } = await fixture();
    await db.order.update({
      where: { id: order.id },
      data: { status: 'CANCELLED' },
    });
    await service.receive(paid(payment));
    (adapter.query as jest.Mock).mockResolvedValue(paid(payment));
    await service.process(payment.id);
    await service.process(payment.id);
    expect(
      (await db.order.findUniqueOrThrow({ where: { id: order.id } })).status,
    ).toBe('CANCELLED');
    expect(await db.refund.count({ where: { paymentId: payment.id } })).toBe(1);
    expect((await service.status(user.id, payment.id)).refundPending).toBe(
      true,
    );
  });
  it('does not confirm a charge against the receipt of a different int64 transaction', async () => {
    const { order, payment } = await fixture();
    await service.receive(paid(payment));
    await db.$executeRaw`UPDATE payments SET expires_at=clock_timestamp()-interval '1 millisecond' WHERE id=${payment.id}::uuid`;
    (adapter.query as jest.Mock).mockResolvedValue(
      paid(payment, String(BigInt(paid(payment).transactionId) + 1n)),
    );
    await service.process(payment.id);
    expect(
      (await db.order.findUniqueOrThrow({ where: { id: order.id } })).status,
    ).toBe('CANCELLED');
    expect(await db.refund.count({ where: { paymentId: payment.id } })).toBe(1);
  });
  it('uses PostgreSQL timestamp precision when a paid receipt is one microsecond before expiry', async () => {
    const { order, payment } = await fixture();
    await service.receive(paid(payment));
    await db.$executeRaw`UPDATE payments p SET expires_at=c.first_paid_received_at+interval '1 microsecond' FROM payment_charges c WHERE p.id=${payment.id}::uuid AND c.payment_id=p.id`;
    expect(
      (await service.status(user.id, payment.id)).verificationDeadline,
    ).not.toBeNull();
    (adapter.query as jest.Mock).mockResolvedValue(paid(payment));
    await service.process(payment.id);
    expect(
      (await db.order.findUniqueOrThrow({ where: { id: order.id } })).status,
    ).toBe('CONFIRMED');
  });
  it('rejects a different merchant than the one persisted in the attempt snapshot', async () => {
    const { payment } = await fixture();
    await db.payment.update({
      where: { id: payment.id },
      data: { requestSnapshot: { partnerCode: 'original-merchant' } },
    });
    await expect(
      service.receive({
        ...paid(payment),
        payload: { partnerCode: 'changed-merchant' },
      }),
    ).rejects.toThrow('merchant');
    expect(
      await db.paymentWebhookInbox.count({ where: { paymentId: payment.id } }),
    ).toBe(0);
  });
  it('deduplicates admin cancellation and later queries using the same charge compensation key', async () => {
    const { order, payment } = await fixture();
    await service.receive(paid(payment));
    (adapter.query as jest.Mock).mockResolvedValue(paid(payment));
    await service.process(payment.id);
    await new PrismaAdminOrderRepository(db).cancelByAdmin({
      orderId: order.id,
      changedBy: user.id,
      reason: 'Customer requested cancellation',
    });
    await service.process(payment.id);
    expect(await db.refund.count({ where: { paymentId: payment.id } })).toBe(1);
    const extra = paid(
      payment,
      String(BigInt(paid(payment).transactionId) + 1n),
    );
    await service.receive(extra);
    (adapter.query as jest.Mock).mockResolvedValue(extra);
    await service.process(payment.id);
    await service.process(payment.id);
    expect(await db.refund.count({ where: { paymentId: payment.id } })).toBe(2);
    expect(
      (await db.order.findUniqueOrThrow({ where: { id: order.id } })).status,
    ).toBe('CANCELLED');
  });
  it('grants only a fixed 60 second grace to timely paid evidence and expires ordinary orders at 15 minutes', async () => {
    const { order, payment } = await fixture();
    await service.receive(paid(payment));
    await db.$executeRaw`UPDATE orders SET created_at=clock_timestamp()-interval '901 seconds' WHERE id=${order.id}::uuid`;
    await db.$executeRaw`UPDATE payments SET expires_at=clock_timestamp()-interval '1 second', first_paid_received_at=clock_timestamp()-interval '2 seconds' WHERE id=${payment.id}::uuid`;
    await service.expire();
    expect(
      (await db.order.findUniqueOrThrow({ where: { id: order.id } })).status,
    ).toBe('PENDING');
    await db.$executeRaw`UPDATE orders SET created_at=clock_timestamp()-interval '961 seconds' WHERE id=${order.id}::uuid`;
    await db.$executeRaw`UPDATE payments SET expires_at=clock_timestamp()-interval '61 seconds' WHERE id=${payment.id}::uuid`;
    await service.expire();
    expect(
      (await db.order.findUniqueOrThrow({ where: { id: order.id } })).status,
    ).toBe('CANCELLED');
  });
  it('does not reveal an owned payment to another account', async () => {
    const { payment } = await fixture();
    await expect(service.status(randomUUID(), payment.id)).rejects.toThrow();
  });
  it('customer cancellation preserves completed money and sanitizes payment responses', async () => {
    const { order, payment } = await fixture();
    await db.payment.update({
      where: { id: payment.id },
      data: {
        status: 'COMPLETED',
        transactionId: paid(payment).transactionId,
        gatewayResponse: { secret: 'hidden' },
      },
    });
    const cancelled = await new PrismaOrderRepository(
      db,
    ).cancelOrderWithTransaction(order.id, customer.id);
    expect(
      (await db.payment.findUniqueOrThrow({ where: { id: payment.id } }))
        .status,
    ).toBe('COMPLETED');
    expect(cancelled.payments![0]).not.toHaveProperty('gatewayResponse');
    expect(await db.refund.count({ where: { paymentId: payment.id } })).toBe(1);
  });
  it('fences an expired claim and lets a restarted worker reclaim without extending payment expiry', async () => {
    const { order, payment } = await fixture();
    await service.receive(paid(payment));
    const worker = new PaymentWorker(db, service);
    const claimed = await worker.claim(50, true);
    const own = claimed.find((c) => c.id === payment.id)!;
    expect(own).toBeDefined();
    expect(await worker.heartbeat(own.id, own.claim_token)).toBe(true);
    await db.$executeRaw`UPDATE payments SET lease_until=clock_timestamp()-interval '1 second' WHERE id=${payment.id}::uuid`;
    expect(await worker.heartbeat(own.id, own.claim_token)).toBe(false);
    (adapter.query as jest.Mock).mockResolvedValue(paid(payment));
    await service.process(payment.id, own.claim_token);
    expect(
      (await db.order.findUniqueOrThrow({ where: { id: order.id } })).status,
    ).toBe('PENDING');
    const reclaimed = (await worker.claim(50, true)).find(
      (c) => c.id === payment.id,
    )!;
    expect(reclaimed.claim_token).not.toBe(own.claim_token);
    await service.process(payment.id, reclaimed.claim_token);
    const fresh = await db.payment.findUniqueOrThrow({
      where: { id: payment.id },
    });
    expect(fresh.expiresAt).toEqual(payment.expiresAt);
    expect(
      (await db.order.findUniqueOrThrow({ where: { id: order.id } })).status,
    ).toBe('CONFIRMED');
  });
});
