import { Test } from '@nestjs/testing';
import {
  BadRequestException,
  INestApplication,
  NotFoundException,
} from '@nestjs/common';
import { createHmac } from 'crypto';
import request = require('supertest');
import { PrismaService } from '@infrastructure/database/prisma.service';
import {
  PaymentsService,
  PAYMENT_GATEWAYS,
} from '../../../application/services/payments.service';
import { VnpayAdapter } from '../../../infrastructure/gateways/gateway-adapters';
import { PaymentCallbacksController } from '../payment-callbacks.controller';
import { PaymentsController } from '../payments.controller';
import { TransformResponseInterceptor } from '@core/interceptors/transform-response.interceptor';

describe('VNPay HTTP contract without external payments', () => {
  let app: INestApplication;
  const saved = { ...process.env };
  const receive = jest.fn();
  const findFirst = jest.fn();

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [PaymentCallbacksController, PaymentsController],
      providers: [
        { provide: PaymentsService, useValue: { receive } },
        {
          provide: PAYMENT_GATEWAYS,
          useValue: {
            VNPAY: new VnpayAdapter(
              { VNPAY_TMN_CODE: 'terminal', VNPAY_HASH_SECRET: 'secret' },
              jest.fn(),
            ),
          },
        },
        { provide: PrismaService, useValue: { payment: { findFirst } } },
      ],
    }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalInterceptors(new TransformResponseInterceptor());
    await app.init();
  });
  beforeEach(() => {
    receive.mockReset().mockResolvedValue(false);
    findFirst.mockReset();
  });
  afterEach(() => {
    process.env = { ...saved };
  });
  afterAll(async () => {
    await app.close();
  });

  function signed(overrides: Record<string, string> = {}) {
    const fields = {
      vnp_TmnCode: 'terminal',
      vnp_TxnRef: 'payment-reference',
      vnp_Amount: '500000',
      vnp_TransactionNo: '123456',
      vnp_ResponseCode: '00',
      vnp_TransactionStatus: '00',
      ...overrides,
    };
    const data = new URLSearchParams(
      Object.entries(fields).sort(([a], [b]) => a.localeCompare(b)),
    ).toString();
    return {
      ...fields,
      vnp_SecureHash: createHmac('sha512', 'secret').update(data).digest('hex'),
    };
  }

  it('returns native IPN JSON and durably receives the verified amount in VND', async () => {
    const reply = await request(app.getHttpServer())
      .get('/api/v1/payments/vnpay/ipn')
      .query(signed())
      .expect(200);
    expect(reply.body).toEqual({ RspCode: '00', Message: 'Confirm Success' });
    expect(receive).toHaveBeenCalledWith(
      expect.objectContaining({
        gateway: 'VNPAY',
        amount: 5000,
        state: 'PAID',
      }),
    );
    receive.mockResolvedValue(true);
    const duplicate = await request(app.getHttpServer())
      .get('/api/v1/payments/vnpay/ipn')
      .query(signed())
      .expect(200);
    expect(duplicate.body.RspCode).toBe('02');
  });

  it('rejects tampered signatures and duplicate query fields before touching payments', async () => {
    const fields = signed();
    const tampered = await request(app.getHttpServer())
      .get('/api/v1/payments/vnpay/ipn')
      .query({ ...fields, vnp_Amount: '100' })
      .expect(200);
    expect(tampered.body.RspCode).toBe('97');
    const duplicate = await request(app.getHttpServer())
      .get('/api/v1/payments/vnpay/ipn')
      .query({ ...fields, vnp_Amount: ['500000', '100'] })
      .expect(200);
    expect(duplicate.body.RspCode).toBe('97');
    expect(receive).not.toHaveBeenCalled();
  });

  it('maps missing payments and amount mismatches to VNPay retry codes', async () => {
    receive.mockRejectedValueOnce(new NotFoundException());
    const missing = await request(app.getHttpServer())
      .get('/api/v1/payments/vnpay/ipn')
      .query(signed())
      .expect(200);
    expect(missing.body.RspCode).toBe('01');
    receive.mockRejectedValueOnce(
      new BadRequestException({ code: 'PAYMENT_INVALID_AMOUNT' }),
    );
    const amount = await request(app.getHttpServer())
      .get('/api/v1/payments/vnpay/ipn')
      .query(signed())
      .expect(200);
    expect(amount.body.RspCode).toBe('04');
  });

  it('does not accept a bank failure as paid', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/payments/vnpay/ipn')
      .query(signed({ vnp_ResponseCode: '24', vnp_TransactionStatus: '02' }))
      .expect(200);
    expect(receive).toHaveBeenCalledWith(
      expect.objectContaining({ state: 'UNKNOWN', code: '24' }),
    );
  });

  it('browser return only redirects using a live state; it never confirms a payment', async () => {
    process.env.PAYMENT_WEB_RETURN_URL =
      'https://shop.example.test/payment/return';
    const state = 'a'.repeat(64);
    findFirst.mockResolvedValue({ id: 'payment-id', platform: 'WEB' });
    const reply = await request(app.getHttpServer())
      .get('/api/v1/payments/vnpay/callback')
      .query({ state, vnp_ResponseCode: '00' })
      .expect(303);
    expect(reply.headers.location).toBe(
      'https://shop.example.test/payment/return?paymentId=payment-id',
    );
    expect(reply.headers['cache-control']).toBe('no-store');
    expect(receive).not.toHaveBeenCalled();
    findFirst.mockResolvedValue(null);
    await request(app.getHttpServer())
      .get('/api/v1/payments/vnpay/callback')
      .query({ state })
      .expect(410);
    await request(app.getHttpServer())
      .get('/api/v1/payments/vnpay/callback')
      .query({ state: 'invalid' })
      .expect(400);
  });

  it('publishes availability without exposing terminal codes or secrets', async () => {
    process.env.VNPAY_ENABLED = 'false';
    process.env.SEPAY_ENABLED = 'false';
    const reply = await request(app.getHttpServer())
      .get('/api/v1/payments/methods')
      .expect(200);
    expect(reply.body.data).toEqual({ COD: true, SEPAY: false });
    expect(JSON.stringify(reply.body)).not.toContain('HASH_SECRET');
  });
});
