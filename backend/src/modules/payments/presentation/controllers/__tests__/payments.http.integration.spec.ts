import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import request = require('supertest');
import { randomUUID, createHmac } from 'crypto';
import * as jwt from 'jsonwebtoken';
import { PrismaModule } from '@infrastructure/database/prisma.module';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { JwtAuthGuard } from '@core/guards/jwt-auth.guard';
import { AllExceptionsFilter } from '@core/filters/http-exception.filter';
import { TransformResponseInterceptor } from '@core/interceptors/transform-response.interceptor';
import { PaymentsModule } from '../../../payments.module';
import { UsersModule } from '@modules/users/users.module';
import { NotificationsModule } from '@modules/notifications/notifications.module';
const integration = process.env.TEST_DATABASE_URL ? describe : describe.skip;
integration('Public payment protocol and private API contracts', () => {
  let app: INestApplication;
  let db: PrismaService;
  beforeAll(async () => {
    const url = new URL(process.env.TEST_DATABASE_URL!);
    if (
      !['localhost', '127.0.0.1'].includes(url.hostname) ||
      !url.pathname.endsWith('_test')
    )
      throw new Error('Dedicated test DB required');
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
    process.env.ZALOPAY_KEY2 = 'test-key2';
    process.env.ZALOPAY_APP_ID = '2553';
    process.env.MOMO_PARTNER_CODE = 'test-merchant';
    process.env.MOMO_ACCESS_KEY = 'test-access';
    process.env.MOMO_SECRET_KEY = 'test-secret';
    process.env.VNPAY_HASH_SECRET = 'test-vnp-secret';
    process.env.VNPAY_TMN_CODE = 'test-vnp-merchant';
    process.env.JWT_SECRET = 'sprint3-test-secret';
    process.env.MOMO_ENABLED = 'true';
    process.env.MOMO_MAX_QPS = '50';
    process.env.PAYMENT_PUBLIC_BASE_URL = 'https://test.example/api/v1';
    process.env.PAYMENT_WEB_RETURN_URL = 'https://test.example/payment/return';
    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
        PrismaModule,
        PaymentsModule,
        UsersModule,
        NotificationsModule,
      ],
      providers: [{ provide: APP_GUARD, useClass: JwtAuthGuard }],
    }).compile();
    app = module.createNestApplication({ rawBody: true });
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalInterceptors(new TransformResponseInterceptor());
    await app.init();
    db = module.get(PrismaService);
  });
  afterAll(async () => {
    await app?.close();
  });
  async function callbackFixture(method: string) {
    await db.role.upsert({
      where: { id: 6 },
      create: { id: 6, name: 'Customer', displayName: 'Customer' },
      update: {},
    });
    const user = await db.user.create({
      data: { email: `${randomUUID()}@test.example`, fullName: 'Test' },
    });
    const customer = await db.customer.create({ data: { userId: user.id } });
    const store = await db.store.create({
      data: {
        name: 'Test',
        code: randomUUID().slice(0, 8),
        address: 'Test',
        city: 'Test',
        district: 'Test',
      },
    });
    const order = await db.order.create({
      data: {
        orderNumber: randomUUID(),
        storeId: store.id,
        customerId: customer.id,
        status: 'PENDING',
        orderType: 'ONLINE',
        subtotal: 5000,
        totalAmount: 5000,
      },
    });
    const payment = await db.payment.create({
      data: {
        orderId: order.id,
        merchantReference: randomUUID(),
        requestId: randomUUID(),
        paymentMethod: method,
        amount: 5000,
        status: 'PAYABLE',
        platform: 'WEB',
        expiresAt: new Date(Date.now() + 900000),
        returnState: randomUUID().replace(/-/g, '').repeat(2),
        returnStateExpiresAt: new Date(Date.now() + 86400000),
      },
    });
    return { payment, order, user };
  }
  it('uses a native failure response even when JSON middleware rejects malformed MoMo input', async () => {
    const reply = await request(app.getHttpServer())
      .post('/api/v1/payments/momo/ipn')
      .set('Content-Type', 'application/json')
      .send('{')
      .expect(400);
    expect(reply.text).toBe('');
  });
  it('ACKs signed MoMo raw int64 with empty 204 and defers confirmation', async () => {
    const { payment, order } = await callbackFixture('MOMO');
    const txn = String(
      9007199254740993n +
        BigInt('0x' + payment.id.replace(/-/g, '').slice(0, 8)),
    );
    const r = {
      partnerCode: 'test-merchant',
      orderId: payment.merchantReference,
      requestId: payment.requestId,
      amount: '5000',
      orderInfo: 'Test',
      orderType: 'momo_wallet',
      transId: txn,
      resultCode: '0',
      message: 'Success',
      payType: 'qr',
      responseTime: '1234567890',
      extraData: '',
    };
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
    const signed = { accessKey: 'test-access', ...r };
    const signature = createHmac('sha256', 'test-secret')
      .update(keys.map((k) => `${k}=${signed[k]}`).join('&'))
      .digest('hex');
    const raw = JSON.stringify({ ...r, signature }).replace(
      `"transId":"${txn}"`,
      `"transId":${txn}`,
    );
    const response = await request(app.getHttpServer())
      .post('/api/v1/payments/momo/ipn')
      .set('Content-Type', 'application/json')
      .send(raw)
      .expect(204);
    expect(response.text).toBe('');
    expect(
      (
        await db.paymentCharge.findFirstOrThrow({
          where: { paymentId: payment.id },
        })
      ).transactionId,
    ).toBe(txn);
    expect(
      (await db.order.findUniqueOrThrow({ where: { id: order.id } })).status,
    ).toBe('PENDING');
  });
  it('returns only to fixed Web/Mobile destinations and never confirms from browser parameters', async () => {
    const { payment, order } = await callbackFixture('MOMO');
    const web = await request(app.getHttpServer())
      .get(
        `/api/v1/payments/momo/callback?state=${payment.returnState}&resultCode=0&returnUrl=https://evil.example`,
      )
      .expect(303);
    expect(new URL(web.headers.location).origin).toBe('https://test.example');
    await db.payment.update({
      where: { id: payment.id },
      data: { platform: 'MOBILE' },
    });
    const mobile = await request(app.getHttpServer())
      .get(`/api/v1/payments/momo/callback?state=${payment.returnState}`)
      .expect(200);
    expect(mobile.text).toContain(
      `glowup://payment/return?paymentId=${payment.id}`,
    );
    expect(mobile.headers['cache-control']).toBe('no-store');
    expect(
      (await db.order.findUniqueOrThrow({ where: { id: order.id } })).status,
    ).toBe('PENDING');
    await db.payment.update({
      where: { id: payment.id },
      data: { returnStateExpiresAt: new Date(Date.now() - 1000) },
    });
    await request(app.getHttpServer())
      .get(`/api/v1/payments/momo/callback?state=${payment.returnState}`)
      .expect(410);
  });
  it('uses the actual HTTP create status in the response envelope', async () => {
    const { payment, order, user } = await callbackFixture('MOMO');
    const token = jwt.sign(
      {
        userId: user.id,
        roleId: 6,
        roleName: 'Customer',
        permissionCodes: [],
        dataScope: 'SELF',
      },
      'sprint3-test-secret',
    );
    const ready = await request(app.getHttpServer())
      .post('/api/v1/payments/momo/create')
      .auth(token, { type: 'bearer' })
      .send({ orderId: order.id })
      .expect(200);
    expect(ready.body.statusCode).toBe(200);
    await db.payment.update({
      where: { id: payment.id },
      data: { status: 'UNKNOWN' },
    });
    const unknown = await request(app.getHttpServer())
      .post('/api/v1/payments/momo/create')
      .auth(token, { type: 'bearer' })
      .send({ orderId: order.id })
      .expect(202);
    expect(unknown.body.statusCode).toBe(202);
  });
  it('rejects null fullName as a validation error without writing profile', async () => {
    const { user } = await callbackFixture('MOMO');
    const token = jwt.sign(
      {
        userId: user.id,
        roleId: 6,
        roleName: 'Customer',
        permissionCodes: [],
        dataScope: 'SELF',
      },
      'sprint3-test-secret',
    );
    await request(app.getHttpServer())
      .put('/api/v1/users/me')
      .auth(token, { type: 'bearer' })
      .send({ fullName: null })
      .expect(400);
    expect(
      (await db.user.findUniqueOrThrow({ where: { id: user.id } })).fullName,
    ).toBe('Test');
  });
  it('requires JWT ownership for payment status, profile and notifications', async () => {
    for (const path of [
      `payments/${randomUUID()}/status`,
      'users/me',
      'notifications',
    ])
      await request(app.getHttpServer()).get(`/api/v1/${path}`).expect(401);
  });
  it('preserves the public amount error code and rejects before initiating an attempt', async () => {
    await db.role.upsert({
      where: { id: 6 },
      create: { id: 6, name: 'Customer', displayName: 'Customer' },
      update: {},
    });
    const user = await db.user.create({
      data: { email: `${randomUUID()}@test.example`, fullName: 'Test' },
    });
    const customer = await db.customer.create({ data: { userId: user.id } });
    const store = await db.store.create({
      data: {
        name: 'Test',
        code: randomUUID().slice(0, 8),
        address: 'Test',
        city: 'Test',
        district: 'Test',
      },
    });
    const order = await db.order.create({
      data: {
        orderNumber: randomUUID(),
        storeId: store.id,
        customerId: customer.id,
        status: 'PENDING',
        orderType: 'ONLINE',
        subtotal: 999,
        totalAmount: 999,
      },
    });
    const payment = await db.payment.create({
      data: {
        orderId: order.id,
        paymentMethod: 'MOMO',
        amount: 999,
        status: 'PENDING',
      },
    });
    const token = jwt.sign(
      {
        userId: user.id,
        roleId: 6,
        roleName: 'Customer',
        permissionCodes: [],
        dataScope: 'SELF',
      },
      'sprint3-test-secret',
    );
    const reply = await request(app.getHttpServer())
      .post('/api/v1/payments/momo/create')
      .auth(token, { type: 'bearer' })
      .send({ orderId: order.id })
      .expect(400);
    expect(reply.body.code).toBe('PAYMENT_AMOUNT_OUT_OF_RANGE');
    expect(
      (await db.payment.findUniqueOrThrow({ where: { id: payment.id } }))
        .merchantReference,
    ).toBeNull();
  });
  it('preserves provider-native ACK errors without response wrapping', async () => {
    const vnp = await request(app.getHttpServer())
      .get('/api/v1/payments/vnpay/ipn?vnp_SecureHash=bad')
      .expect(200);
    expect(vnp.body).toEqual({ RspCode: '97', Message: 'Callback rejected' });
    const zlp = await request(app.getHttpServer())
      .post('/api/v1/payments/zalopay/callback')
      .send({ data: '{}', type: 1, mac: 'bad' })
      .expect(200);
    expect(zlp.body).toEqual({ return_code: 2, return_message: 'Thất bại' });
    const momo = await request(app.getHttpServer())
      .post('/api/v1/payments/momo/ipn')
      .send({ signature: 'bad' })
      .expect(400);
    expect(momo.text).toBe('');
  });
  it('preserves raw ZaloPay int64, stores once, and returns exactly its native success JSON', async () => {
    await db.role.upsert({
      where: { id: 6 },
      create: { id: 6, name: 'Customer', displayName: 'Customer' },
      update: {},
    });
    const user = await db.user.create({
      data: { email: `${randomUUID()}@test.example`, fullName: 'Test' },
    });
    const customer = await db.customer.create({ data: { userId: user.id } });
    const store = await db.store.create({
      data: {
        name: 'Test',
        code: randomUUID().slice(0, 8),
        address: 'Test',
        city: 'Test',
        district: 'Test',
      },
    });
    const order = await db.order.create({
      data: {
        orderNumber: randomUUID(),
        storeId: store.id,
        customerId: customer.id,
        status: 'PENDING',
        orderType: 'ONLINE',
        subtotal: 5000,
        totalAmount: 5000,
      },
    });
    const ref = randomUUID();
    const txn = String(
      9007199254740993n + BigInt('0x' + ref.replace(/-/g, '').slice(0, 8)),
    );
    const payment = await db.payment.create({
      data: {
        orderId: order.id,
        merchantReference: ref,
        paymentMethod: 'ZALOPAY',
        amount: 5000,
        status: 'PAYABLE',
        expiresAt: new Date(Date.now() + 900000),
      },
    });
    const data = `{"app_id":2553,"app_trans_id":"${ref}","amount":5000,"zp_trans_id":${txn}}`;
    const raw = JSON.stringify({
      data,
      type: 1,
      mac: createHmac('sha256', 'test-key2').update(data).digest('hex'),
    });
    for (let i = 0; i < 2; i++) {
      const reply = await request(app.getHttpServer())
        .post('/api/v1/payments/zalopay/callback')
        .set('Content-Type', 'application/json')
        .send(raw)
        .expect(200);
      expect(reply.body).toEqual({
        return_code: 1,
        return_message: 'Thành công',
      });
    }
    expect(
      await db.paymentWebhookInbox.count({ where: { paymentId: payment.id } }),
    ).toBe(1);
    expect(
      (
        await db.paymentWebhookInbox.findFirstOrThrow({
          where: { paymentId: payment.id },
        })
      ).payload,
    ).toHaveProperty('data', data);
    expect(
      (
        await db.paymentCharge.findFirstOrThrow({
          where: { paymentId: payment.id },
        })
      ).transactionId,
    ).toBe(txn);
  });
});
