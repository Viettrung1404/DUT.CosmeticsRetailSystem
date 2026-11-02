import { createHmac } from 'crypto';
import { Attempt } from '../gateway-adapters';
import {
  SepayAdapter,
  createSepayTransport,
  sepayApiBase,
} from '../sepay-adapter';

describe('SePay bank transfers', () => {
  const env = {
    SEPAY_MODE: 'sandbox',
    SEPAY_API_TOKEN: 'token',
    SEPAY_WEBHOOK_SECRET: 'secret',
    SEPAY_ACCOUNT_NUMBER: '0123456789',
    SEPAY_BANK_ACCOUNT_ID: 'f9e8d7c6-b5a4-3210-fedc-ba0987654321',
    SEPAY_BANK_CODE: 'ACB',
    SEPAY_ACCOUNT_NAME: 'GLOWUP',
    SEPAY_MAX_QPS: '3',
  };
  const reference = `GU${'A'.repeat(32)}`;
  const attempt: Attempt = {
    id: 'id',
    merchantReference: reference,
    requestId: 'request',
    amount: 299100,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 900000),
    returnUrl: '',
    userId: 'user',
    ip: '127.0.0.1',
  };
  const webhook = {
    id: 92704,
    accountNumber: env.SEPAY_ACCOUNT_NUMBER,
    transferType: 'in',
    transferAmount: 299100,
    code: reference,
    content: `Thanh toan ${reference}`,
    referenceCode: 'FT261101ABC',
  };
  const transaction = {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    account_number: env.SEPAY_ACCOUNT_NUMBER,
    bank_account_id: env.SEPAY_BANK_ACCOUNT_ID,
    transfer_type: 'in',
    amount_in: 299100,
    amount_out: 0,
    transaction_content: webhook.content,
    code: reference,
    reference_number: webhook.referenceCode,
  };
  const get = jest.fn();
  const adapter = new SepayAdapter(env, get);
  beforeEach(() => get.mockReset());

  it('creates replayable QR instructions with exact amount and reference, without an outbound payment', async () => {
    const request = adapter.prepare(attempt);
    const first = await adapter.create(request);
    expect(await adapter.create(request)).toEqual(first);
    const qr = JSON.parse(first.qrCodeData!);
    const url = new URL(qr.imageUrl);
    expect(url.origin).toBe('https://vietqr.app');
    expect(url.searchParams.get('des')).toBe(reference);
    expect(url.searchParams.get('amount')).toBe('299100');
    expect(url.searchParams.get('acc')).toBe(env.SEPAY_ACCOUNT_NUMBER);
    expect(first.paymentUrl).toBeNull();
    expect(get).not.toHaveBeenCalled();
    expect(first.qrCodeData).not.toContain('secret');
    expect(first.qrCodeData).not.toContain('token');
  });
  it('verifies original bytes and rejects tampering, missing headers, stale timestamps and missing secrets', () => {
    const raw = JSON.stringify(webhook);
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = `sha256=${createHmac('sha256', 'secret').update(`${timestamp}.${raw}`).digest('hex')}`;
    expect(() =>
      adapter.verifyWebhook(raw, signature, timestamp),
    ).not.toThrow();
    expect(() =>
      adapter.verifyWebhook(raw + ' ', signature, timestamp),
    ).toThrow();
    expect(() => adapter.verifyWebhook(raw, '', timestamp)).toThrow();
    expect(() =>
      adapter.verifyWebhook(raw, signature, String(Number(timestamp) - 301)),
    ).toThrow();
    expect(() => adapter.verifyWebhook(raw, signature, 'NaN')).toThrow();
    expect(() =>
      new SepayAdapter({}, get).verifyWebhook(raw, signature, timestamp),
    ).toThrow();
  });
  it('uses the bank reference consistently across webhook numeric IDs and API UUIDs', async () => {
    get.mockResolvedValue({ status: 'success', data: [transaction] });
    const received = adapter.callback(JSON.stringify(webhook));
    const queried = await adapter.query({
      ...attempt,
      transactionId: received.transactionId,
    });
    expect(received.transactionId).toBe('FT261101ABC');
    expect(queried).toMatchObject({
      gateway: 'SEPAY',
      merchantReference: reference,
      state: 'PAID',
      amount: 299100,
      transactionId: received.transactionId,
      merchantId: env.SEPAY_ACCOUNT_NUMBER,
    });
    const query = new URL(get.mock.calls[0][0]);
    expect(query.hostname).toBe('userapi-sandbox.sepay.vn');
    expect(query.searchParams.get('reference_number')).toBe(
      received.transactionId,
    );
  });
  it('accepts a code embedded in bank content but rejects partial or ambiguous matches', () => {
    expect(adapter.callback({ ...webhook, code: null }).merchantReference).toBe(
      reference,
    );
    expect(() =>
      adapter.callback({ ...webhook, code: null, content: `${reference}F` }),
    ).toThrow();
    expect(() =>
      adapter.callback({
        ...webhook,
        content: `${reference} GU${'B'.repeat(32)}`,
      }),
    ).toThrow();
    expect(() =>
      adapter.callback({ ...webhook, transferType: 'out' }),
    ).toThrow();
    expect(() =>
      adapter.callback({ ...webhook, accountNumber: 'other' }),
    ).toThrow();
    expect(() =>
      adapter.callback({ ...webhook, transferAmount: 1.5 }),
    ).toThrow();
    expect(() =>
      adapter.callback({ ...webhook, referenceCode: null }),
    ).toThrow();
    expect(() =>
      adapter.callback('{"transferType":"in","transferType":"out"}'),
    ).toThrow();
  });
  it.each([
    { account_number: 'other' },
    { bank_account_id: 'other' },
    { transfer_type: 'out' },
    { amount_out: 1 },
    { code: null, transaction_content: `${reference}F` },
  ])('never marks unrelated API transactions paid: %j', async (override) => {
    get.mockResolvedValue({
      status: 'success',
      data: [{ ...transaction, ...override }],
    });
    expect((await adapter.query(attempt)).state).toBe('PAYABLE');
  });
  it('fails closed on malformed responses, provider errors, multiple matches and pagination', async () => {
    for (const result of [
      { status: 'error', data: [] },
      { status: 'success' },
      { status: 'success', data: [transaction, transaction] },
      { status: 'success', data: [], meta: { pagination: { has_more: true } } },
    ]) {
      get.mockResolvedValue(result);
      await expect(adapter.query(attempt)).rejects.toThrow();
    }
    get.mockRejectedValue(new Error('timeout'));
    await expect(adapter.query(attempt)).rejects.toThrow('timeout');
  });
  it('separates sandbox/live and disallows sandbox in production', () => {
    expect(sepayApiBase({ SEPAY_MODE: 'live' })).toBe(
      'https://userapi.sepay.vn/v2',
    );
    expect(() =>
      sepayApiBase({ SEPAY_MODE: 'sandbox', NODE_ENV: 'production' }),
    ).toThrow();
    expect(() => sepayApiBase({ SEPAY_MODE: 'anything' })).toThrow();
  });
  it('limits API calls and sends tokens only to the fixed provider origin', async () => {
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response('{"status":"success","data":[]}'));
    try {
      const transport = createSepayTransport({ ...env, SEPAY_MAX_QPS: '1' });
      await expect(
        transport('https://evil.test/transactions?'),
      ).rejects.toThrow();
      await transport(
        'https://userapi-sandbox.sepay.vn/v2/transactions?q=test',
      );
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock.mock.calls[0][1]?.headers).toMatchObject({
        Authorization: 'Bearer token',
      });
      await expect(
        transport('https://userapi-sandbox.sepay.vn/v2/transactions?q=test'),
      ).rejects.toThrow();
    } finally {
      fetchMock.mockRestore();
    }
  });
});
