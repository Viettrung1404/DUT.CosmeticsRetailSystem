import { createHmac } from 'crypto';
import { VnpayQueryError } from '../../../domain/vnpay-query.error';
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
  it('verifies VNPay QueryDR signatures and binds the response to the merchant/reference', async () => {
    const payload = {
      vnp_ResponseId: 'response',
      vnp_Command: 'querydr',
      vnp_ResponseCode: '00',
      vnp_Message: 'Success',
      vnp_TmnCode: 'merchant',
      vnp_TxnRef: a.merchantReference,
      vnp_Amount: '500000',
      vnp_BankCode: 'NCB',
      vnp_PayDate: '20261011101500',
      vnp_TransactionNo: '123456',
      vnp_TransactionType: '01',
      vnp_TransactionStatus: '00',
      vnp_OrderInfo: 'GlowUp id',
      vnp_SecureHash: hmac(
        'secret',
        'response|querydr|00|Success|merchant|261011_attempt|500000|NCB|20261011101500|123456|01|00|GlowUp id||',
        'sha512',
      ),
    };
    const http = jest.fn().mockResolvedValue(payload);
    const adapter = new VnpayAdapter(
      { VNPAY_TMN_CODE: 'merchant', VNPAY_HASH_SECRET: 'secret' },
      http,
    );
    await expect(adapter.query(a)).resolves.toMatchObject({
      state: 'PAID',
      amount: 5000,
      transactionId: '123456',
    });
    const [url, body] = http.mock.calls[0];
    expect(url).toBe(
      'https://sandbox.vnpayment.vn/merchant_webapi/api/transaction',
    );
    expect(body.vnp_TransactionDate).toBe('20261011100000');
    expect(body.vnp_SecureHash).toBe(
      hmac(
        'secret',
        `${body.vnp_RequestId}|2.1.0|querydr|merchant|261011_attempt|20261011100000|${body.vnp_CreateDate}|127.0.0.1|Query id`,
        'sha512',
      ),
    );
    http.mockResolvedValueOnce({ ...payload, vnp_Amount: '100' });
    await expect(adapter.query(a)).rejects.toThrow('Invalid signature');
    const wrongMerchant =
      'response|querydr|00|Success|other|261011_attempt|500000|NCB|20261011101500|123456|01|00|GlowUp id||';
    http.mockResolvedValueOnce({
      ...payload,
      vnp_TmnCode: 'other',
      vnp_SecureHash: hmac('secret', wrongMerchant, 'sha512'),
    });
    await expect(adapter.query(a)).rejects.toThrow(
      'VNPay query response mismatch',
    );
  });
  it.each(['91', '99'])(
    'reports unsigned VNPay API error %s without accepting payment evidence',
    async (code) => {
      const http = jest.fn().mockResolvedValue({
        vnp_ResponseCode: code,
        vnp_Message: 'Unexpected error',
        vnp_TransactionStatus: '00',
      });
      const adapter = new VnpayAdapter(
        { VNPAY_TMN_CODE: 'merchant', VNPAY_HASH_SECRET: 'secret' },
        http,
      );
      const error = await adapter.query(a).catch((error) => error);
      expect(error).toBeInstanceOf(VnpayQueryError);
      expect(error.getStatus()).toBe(503);
      expect(error.getResponse()).toMatchObject({
        code: 'VNPAY_QUERY_UNAVAILABLE',
        responseCode: code,
        requestId: http.mock.calls[0][1].vnp_RequestId,
      });
    },
  );
  it.each([
    { vnp_ResponseCode: '00' },
    { vnp_ResponseCode: '99', vnp_SecureHash: 'invalid' },
    { vnp_ResponseCode: 'untrusted error text' },
  ])(
    'still rejects unsigned success and invalid VNPay signatures: %j',
    async (payload) => {
      const adapter = new VnpayAdapter(
        { VNPAY_TMN_CODE: 'merchant', VNPAY_HASH_SECRET: 'secret' },
        jest.fn().mockResolvedValue(payload),
      );
      await expect(adapter.query(a)).rejects.toThrow('Invalid signature');
    },
  );
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
