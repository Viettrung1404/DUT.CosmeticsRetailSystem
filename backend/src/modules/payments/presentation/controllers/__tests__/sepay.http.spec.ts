import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { createHmac } from 'crypto';
import request = require('supertest');
import { PrismaService } from '@infrastructure/database/prisma.service';
import {
  PAYMENT_GATEWAYS,
  PaymentsService,
} from '../../../application/services/payments.service';
import { SepayAdapter } from '../../../infrastructure/gateways/sepay-adapter';
import { PaymentCallbacksController } from '../payment-callbacks.controller';
import { TransformResponseInterceptor } from '@core/interceptors/transform-response.interceptor';

describe('SePay webhook HTTP contract', () => {
  let app: INestApplication;
  const receive = jest.fn();
  const payload = JSON.stringify({
    id: 92704,
    transferType: 'in',
    accountNumber: '0123456789',
    code: `GU${'A'.repeat(32)}`,
    content: 'Payment',
    transferAmount: 299100,
    referenceCode: 'FT261101ABC',
  });
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = (raw: string) =>
    `sha256=${createHmac('sha256', 'secret').update(`${timestamp}.${raw}`).digest('hex')}`;
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [PaymentCallbacksController],
      providers: [
        { provide: PaymentsService, useValue: { receive } },
        { provide: PrismaService, useValue: {} },
        {
          provide: PAYMENT_GATEWAYS,
          useValue: {
            SEPAY: new SepayAdapter(
              {
                SEPAY_WEBHOOK_SECRET: 'secret',
                SEPAY_ACCOUNT_NUMBER: '0123456789',
              },
              jest.fn(),
            ),
          },
        },
      ],
    }).compile();
    app = module.createNestApplication({ rawBody: true });
    app.setGlobalPrefix('api/v1');
    app.useGlobalInterceptors(new TransformResponseInterceptor());
    await app.init();
  });
  beforeEach(() => receive.mockReset().mockResolvedValue(false));
  afterAll(() => app.close());
  function send(raw = payload, signed = signature(raw)) {
    return request(app.getHttpServer())
      .post('/api/v1/payments/sepay/webhook')
      .set('Content-Type', 'application/json')
      .set('x-sepay-timestamp', timestamp)
      .set('x-sepay-signature', signed)
      .send(raw);
  }
  it('returns native success JSON only after durable receipt; duplicate retries also succeed', async () => {
    expect((await send().expect(200)).body).toEqual({ success: true });
    expect(receive).toHaveBeenCalledWith(
      expect.objectContaining({
        gateway: 'SEPAY',
        amount: 299100,
        transactionId: 'FT261101ABC',
      }),
    );
    receive.mockResolvedValue(true);
    expect((await send().expect(200)).body).toEqual({ success: true });
  });
  it('rejects altered bytes and missing authentication before storing anything', async () => {
    await send(payload + ' ', signature(payload)).expect(401);
    await request(app.getHttpServer())
      .post('/api/v1/payments/sepay/webhook')
      .send(JSON.parse(payload))
      .expect(401);
    expect(receive).not.toHaveBeenCalled();
  });
  it('does not acknowledge a storage failure, so SePay can retry', async () => {
    receive.mockRejectedValue(new Error('database unavailable'));
    expect((await send().expect(503)).body).toEqual({ success: false });
  });
  it('rejects outgoing transfers before storing anything', async () => {
    const outgoing = payload.replace('"in"', '"out"');
    await send(outgoing).expect(400);
    expect(receive).not.toHaveBeenCalled();
  });
});
