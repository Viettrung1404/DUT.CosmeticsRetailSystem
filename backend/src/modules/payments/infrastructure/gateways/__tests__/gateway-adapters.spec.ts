import { createHmac } from 'crypto';
import {
  Attempt,
  MomoAdapter,
  parseGatewayJson,
  VnpayAdapter,
  ZalopayAdapter,
} from '../gateway-adapters';

const hmac = (key: string, data: string, algorithm = 'sha256') =>
  createHmac(algorithm, key).update(data).digest('hex');
const now = new Date('2026-10-11T03:10:00Z');
const a: Attempt = {
  id: 'id',
  merchantReference: '261011_attempt',
  requestId: 'request',
  amount: 5000,
  expiresAt: new Date('2026-10-11T03:15:00Z'),
  createdAt: new Date('2026-10-11T03:00:00Z'),
  returnUrl: 'https://example.test/return?state=random',
  userId: 'user',
  ip: '127.0.0.1',
};
describe('Gateway protocol adapters', () => {
  it('preserves two adjacent int64 transaction IDs beyond JS precision', () => {
    const data = parseGatewayJson(
      '{"one":9007199254740992,"two":9007199254740993}',
    );
    expect(String(data.one)).toBe('9007199254740992');
    expect(String(data.two)).toBe('9007199254740993');
  });
  it('signs MoMo create with stable references and without inventing expiry', () => {
    const adapter = new MomoAdapter(
      {
        MOMO_PARTNER_CODE: 'merchant',
        MOMO_ACCESS_KEY: 'access',
        MOMO_SECRET_KEY: 'secret',
        PAYMENT_PUBLIC_BASE_URL: 'https://example.test/api/v1',
      },
      jest.fn(),
    );
    const r = adapter.prepare(a, now);
    expect(r.signature).toBe(
      hmac(
        'secret',
        'accessKey=access&amount=5000&extraData=&ipnUrl=https://example.test/api/v1/payments/momo/ipn&orderId=261011_attempt&orderInfo=GlowUp id&partnerCode=merchant&redirectUrl=https://example.test/return?state=random&requestId=request&requestType=captureWallet',
      ),
    );
    expect(r.expire).toBeUndefined();
  });
  it('verifies MoMo raw IPN and never treats authorization as paid', () => {
    const adapter = new MomoAdapter(
      {
        MOMO_PARTNER_CODE: 'merchant',
        MOMO_ACCESS_KEY: 'access',
        MOMO_SECRET_KEY: 'secret',
      },
      jest.fn(),
    );
    const r = {
      partnerCode: 'merchant',
      orderId: 'ref',
      requestId: 'req',
      amount: 1000,
      extraData: '',
      message: 'Authorized',
      orderInfo: 'test',
      orderType: 'momo_wallet',
      payType: 'qr',
      responseTime: 1,
      resultCode: 9000,
      transId: '9007199254740993',
    };
    const sig = hmac(
      'secret',
      'accessKey=access&amount=1000&extraData=&message=Authorized&orderId=ref&orderInfo=test&orderType=momo_wallet&partnerCode=merchant&payType=qr&requestId=req&responseTime=1&resultCode=9000&transId=9007199254740993',
    );
    const raw = JSON.stringify({ ...r, signature: sig }).replace(
      '"9007199254740993"',
      '9007199254740993',
    );
    expect(adapter.callback(raw)).toMatchObject({
      transactionId: '9007199254740993',
      state: 'PENDING',
    });
    expect(() => adapter.callback({ ...r, signature: 'bad' })).toThrow();
  });
  it('uses VNPay GMT+7 expiry and amount x100, with a verifiable sorted signature', async () => {
    const adapter = new VnpayAdapter(
      {
        VNPAY_TMN_CODE: 'merchant',
        VNPAY_HASH_SECRET: 'secret',
        VNPAY_PAYMENT_URL: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
      },
      jest.fn(),
    );
    const r = adapter.prepare(a, now);
    expect(r.vnp_Amount).toBe('500000');
    expect(r.vnp_ExpireDate).toBe('20261011101500');
    const result = await adapter.create(r, a);
    expect(
      new URL(result.paymentUrl!).searchParams.get('vnp_SecureHash'),
    ).toHaveLength(128);
    const fields = {
      vnp_TmnCode: 'merchant',
      vnp_TxnRef: 'ref',
      vnp_Amount: '500000',
      vnp_TransactionNo: '123',
      vnp_ResponseCode: '00',
      vnp_TransactionStatus: '00',
    };
    const signed = Object.keys(fields)
      .sort()
      .map(
        (k) =>
          `${encodeURIComponent(k)}=${encodeURIComponent(fields[k]).replace(/%20/g, '+')}`,
      )
      .join('&');
    expect(
      adapter.callback({
        ...fields,
        vnp_SecureHash: hmac('secret', signed, 'sha512'),
      }),
    ).toMatchObject({ amount: 5000, state: 'PAID' });
  });
  it('signs ZaloPay expiry remaining seconds and validates the original data string with key2', () => {
    const adapter = new ZalopayAdapter(
      {
        ZALOPAY_APP_ID: '2553',
        ZALOPAY_KEY1: 'key1',
        ZALOPAY_KEY2: 'key2',
        PAYMENT_PUBLIC_BASE_URL: 'https://example.test/api/v1',
      },
      jest.fn(),
    );
    const r = adapter.prepare(a, now);
    expect(r.expire_duration_seconds).toBe(300);
    expect(r.mac).toBe(
      hmac(
        'key1',
        `2553|261011_attempt|user|5000|${now.getTime()}|${r.embed_data}|[]`,
      ),
    );
    const data =
      '{"app_id":2553,"app_trans_id":"ref","amount":5000,"zp_trans_id":9007199254740993}';
    expect(
      adapter.callback(
        JSON.stringify({ data, type: 1, mac: hmac('key2', data) }),
      ),
    ).toMatchObject({ transactionId: '9007199254740993', state: 'PAID' });
    expect(() =>
      adapter.callback({ data, type: 2, mac: hmac('key2', data) }),
    ).toThrow();
  });
});
