import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { parse } from 'lossless-json';
import {
  Gateway,
  GatewayState,
  gatewayState,
  zaloDuration,
} from '../../domain/payment-policy';
export interface Attempt {
  id: string;
  merchantReference: string;
  requestId: string;
  amount: number;
  expiresAt: Date;
  createdAt: Date;
  returnUrl: string;
  userId: string;
  ip: string;
}
export interface Observation {
  gateway: Gateway;
  merchantReference: string;
  transactionId: string;
  amount: number;
  state: GatewayState;
  code: string;
  subCode: string;
  kind: string;
  requestId?: string;
  merchantId?: string;
  payload: Record<string, any>;
}
export interface Creation {
  status: 'PAYABLE' | 'UNKNOWN' | 'FAILED';
  paymentUrl: string | null;
  walletDeeplink: string | null;
  qrCodeData: string | null;
  payload: Record<string, any>;
}
export interface GatewayAdapter {
  method: Gateway;
  prepare(attempt: Attempt, now: Date): Record<string, any>;
  create(request: Record<string, any>, attempt: Attempt): Promise<Creation>;
  query(attempt: Attempt): Promise<Observation>;
  callback(raw: string | Record<string, any>): Observation;
}
export type GatewayHttp = (
  url: string,
  body: Record<string, any>,
  form?: boolean,
) => Promise<Record<string, any>>;
export function parseGatewayJson(raw: string): Record<string, any> {
  const value = parse(raw, undefined, {
    parseNumber: (value) => value,
    onDuplicateKey: () => {
      throw new BadRequestException('Duplicate JSON key');
    },
  });
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new BadRequestException('Invalid gateway payload');
  return value as Record<string, any>;
}
const required = (env: Record<string, string>, key: string) => {
  if (!env[key]) throw new ServiceUnavailableException(`Thiếu cấu hình ${key}`);
  return env[key];
};
const sign = (key: string, value: string, algorithm = 'sha256') =>
  createHmac(algorithm, key).update(value).digest('hex');
function verify(actual: unknown, expected: string) {
  if (
    typeof actual !== 'string' ||
    !/^[a-fA-F0-9]+$/.test(actual) ||
    actual.length !== expected.length ||
    !timingSafeEqual(Buffer.from(actual.toLowerCase()), Buffer.from(expected))
  ) {
    throw new BadRequestException({
      code: 'PAYMENT_INVALID_SIGNATURE',
      message: 'Invalid signature',
    });
  }
}
const input = (raw: string | Record<string, any>) =>
  typeof raw === 'string' ? parseGatewayJson(raw) : raw;
const pairs = (r: Record<string, any>, keys: string[]) =>
  keys.map((k) => `${k}=${r[k] ?? ''}`).join('&');
export const vnDate = (date: Date) =>
  new Date(date.getTime() + 7 * 3600000)
    .toISOString()
    .replace(/[-:T]/g, '')
    .slice(0, 14);
const encode = (v: string) =>
  encodeURIComponent(v)
    .replace(
      /[!'()*]/g,
      (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
    )
    .replace(/%20/g, '+');
const vnpData = (r: Record<string, any>) =>
  Object.keys(r)
    .filter(
      (k) =>
        k.startsWith('vnp_') &&
        !['vnp_SecureHash', 'vnp_SecureHashType'].includes(k),
    )
    .sort()
    .map((k) => {
      if (typeof r[k] !== 'string')
        throw new BadRequestException('Invalid VNPay parameter');
      return `${encode(k)}=${encode(r[k])}`;
    })
    .join('&');
function observation(
  gateway: Gateway,
  r: Record<string, any>,
  reference: any,
  txn: any,
  amount: any,
  code: any,
  sub = '',
  kind = 'PAYMENT',
): Observation {
  const id = String(txn ?? '');
  if (id && !/^\d{1,100}$/.test(id))
    throw new BadRequestException('Invalid transaction ID');
  const state = gatewayState(gateway, String(code), sub);
  if (
    !reference ||
    (state === 'PAID' &&
      (!id ||
        id === '0' ||
        !Number.isSafeInteger(Number(amount)) ||
        Number(amount) <= 0))
  )
    throw new BadRequestException('Invalid payment observation');
  return {
    gateway,
    merchantReference: String(reference),
    transactionId: id,
    amount: Number(amount),
    state,
    code: String(code),
    subCode: sub,
    kind,
    payload: r,
  };
}
export class MomoAdapter implements GatewayAdapter {
  method: Gateway = 'MOMO';
  constructor(
    private env: Record<string, string>,
    private http: GatewayHttp,
  ) {}
  prepare(a: Attempt, now: Date): Record<string, any> {
    const r = {
      partnerCode: required(this.env, 'MOMO_PARTNER_CODE'),
      requestId: a.requestId,
      orderId: a.merchantReference,
      amount: a.amount,
      orderInfo: `GlowUp ${a.id}`,
      redirectUrl: a.returnUrl,
      ipnUrl: `${required(this.env, 'PAYMENT_PUBLIC_BASE_URL').replace(/\/+$/, '')}/payments/momo/ipn`,
      requestType: 'captureWallet',
      extraData: '',
      autoCapture: true,
      lang: 'vi',
    };
    return {
      ...r,
      signature: sign(
        required(this.env, 'MOMO_SECRET_KEY'),
        pairs({ accessKey: required(this.env, 'MOMO_ACCESS_KEY'), ...r }, [
          'accessKey',
          'amount',
          'extraData',
          'ipnUrl',
          'orderId',
          'orderInfo',
          'partnerCode',
          'redirectUrl',
          'requestId',
          'requestType',
        ]),
      ),
    };
  }
  async create(r: Record<string, any>, a: Attempt): Promise<Creation> {
    const data = await this.http(
      this.env.MOMO_CREATE_URL ||
        'https://test-payment.momo.vn/v2/gateway/api/create',
      r,
    );
    if (
      data.partnerCode !== r.partnerCode ||
      data.orderId !== r.orderId ||
      data.requestId !== r.requestId ||
      Number(data.amount) !== a.amount
    )
      throw new BadRequestException('MoMo create response mismatch');
    verify(
      data.signature,
      sign(
        required(this.env, 'MOMO_SECRET_KEY'),
        pairs({ accessKey: required(this.env, 'MOMO_ACCESS_KEY'), ...data }, [
          'accessKey',
          'amount',
          'orderId',
          'partnerCode',
          'payUrl',
          'requestId',
          'responseTime',
          'resultCode',
        ]),
      ),
    );
    return {
      status:
        String(data.resultCode) === '0' && data.payUrl
          ? 'PAYABLE'
          : String(data.resultCode) === '98'
            ? 'FAILED'
            : 'UNKNOWN',
      paymentUrl: data.payUrl || null,
      walletDeeplink: data.deeplink || null,
      qrCodeData: data.qrCodeUrl || null,
      payload: data,
    };
  }
  async query(a: Attempt): Promise<Observation> {
    const r = {
      partnerCode: required(this.env, 'MOMO_PARTNER_CODE'),
      requestId: randomBytes(16).toString('hex'),
      orderId: a.merchantReference,
      lang: 'vi',
    };
    const data = await this.http(
      this.env.MOMO_QUERY_URL ||
        'https://test-payment.momo.vn/v2/gateway/api/query',
      {
        ...r,
        signature: sign(
          required(this.env, 'MOMO_SECRET_KEY'),
          pairs({ accessKey: required(this.env, 'MOMO_ACCESS_KEY'), ...r }, [
            'accessKey',
            'orderId',
            'partnerCode',
            'requestId',
          ]),
        ),
      },
    );
    if (
      data.partnerCode !== r.partnerCode ||
      data.orderId !== r.orderId ||
      data.requestId !== r.requestId
    )
      throw new BadRequestException('MoMo query response mismatch');
    // Query API documents no response HMAC; authenticated HTTPS and identity checks are mandatory.
    return {
      ...observation(
        this.method,
        data,
        data.orderId,
        data.transId,
        data.amount,
        data.resultCode,
      ),
      merchantId: String(data.partnerCode),
    };
  }
  callback(raw: string | Record<string, any>): Observation {
    const r = input(raw);
    verify(
      r.signature,
      sign(
        required(this.env, 'MOMO_SECRET_KEY'),
        pairs({ accessKey: required(this.env, 'MOMO_ACCESS_KEY'), ...r }, [
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
        ]),
      ),
    );
    if (
      r.partnerCode !== required(this.env, 'MOMO_PARTNER_CODE') ||
      r.orderType !== 'momo_wallet'
    )
      throw new BadRequestException('Invalid MoMo merchant or payment type');
    return {
      ...observation(
        this.method,
        r,
        r.orderId,
        r.transId,
        r.amount,
        r.resultCode,
      ),
      requestId: String(r.requestId),
      merchantId: String(r.partnerCode),
    };
  }
}
export class VnpayAdapter implements GatewayAdapter {
  method: Gateway = 'VNPAY';
  constructor(
    private env: Record<string, string>,
    private http: GatewayHttp,
  ) {}
  prepare(a: Attempt, now: Date): Record<string, any> {
    return {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: required(this.env, 'VNPAY_TMN_CODE'),
      vnp_Amount: String(a.amount * 100),
      vnp_CreateDate: vnDate(now),
      vnp_ExpireDate: vnDate(a.expiresAt),
      vnp_CurrCode: 'VND',
      vnp_IpAddr: a.ip,
      vnp_Locale: 'vn',
      vnp_OrderInfo: `GlowUp ${a.id.replace(/-/g, '')}`,
      vnp_OrderType: 'other',
      vnp_ReturnUrl: a.returnUrl,
      vnp_TxnRef: a.merchantReference,
    };
  }
  async create(r: Record<string, any>, a: Attempt): Promise<Creation> {
    const data = vnpData(r);
    return {
      status: 'PAYABLE',
      paymentUrl: `${this.env.VNPAY_PAYMENT_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html'}?${data}&vnp_SecureHash=${sign(required(this.env, 'VNPAY_HASH_SECRET'), data, 'sha512')}`,
      walletDeeplink: null,
      qrCodeData: null,
      payload: {},
    };
  }
  async query(a: Attempt): Promise<Observation> {
    const r = {
      vnp_RequestId: randomBytes(16).toString('hex'),
      vnp_Version: '2.1.0',
      vnp_Command: 'querydr',
      vnp_TmnCode: required(this.env, 'VNPAY_TMN_CODE'),
      vnp_TxnRef: a.merchantReference,
      vnp_TransactionDate: vnDate(a.createdAt),
      vnp_CreateDate: vnDate(new Date()),
      vnp_IpAddr: this.env.PAYMENT_QUERY_IP || '127.0.0.1',
      vnp_OrderInfo: `Query ${a.id.replace(/-/g, '')}`,
    };
    const keys = [
      'vnp_RequestId',
      'vnp_Version',
      'vnp_Command',
      'vnp_TmnCode',
      'vnp_TxnRef',
      'vnp_TransactionDate',
      'vnp_CreateDate',
      'vnp_IpAddr',
      'vnp_OrderInfo',
    ];
    const data = await this.http(
      this.env.VNPAY_QUERY_URL ||
        'https://sandbox.vnpayment.vn/merchant_webapi/api/transaction',
      {
        ...r,
        vnp_SecureHash: sign(
          required(this.env, 'VNPAY_HASH_SECRET'),
          keys.map((k) => r[k] ?? '').join('|'),
          'sha512',
        ),
      },
    );
    const responseKeys = [
      'vnp_ResponseId',
      'vnp_Command',
      'vnp_ResponseCode',
      'vnp_Message',
      'vnp_TmnCode',
      'vnp_TxnRef',
      'vnp_Amount',
      'vnp_BankCode',
      'vnp_PayDate',
      'vnp_TransactionNo',
      'vnp_TransactionType',
      'vnp_TransactionStatus',
      'vnp_OrderInfo',
      'vnp_PromotionCode',
      'vnp_PromotionAmount',
    ];
    verify(
      data.vnp_SecureHash,
      sign(
        required(this.env, 'VNPAY_HASH_SECRET'),
        responseKeys.map((k) => data[k] ?? '').join('|'),
        'sha512',
      ),
    );
    if (
      data.vnp_TmnCode !== r.vnp_TmnCode ||
      data.vnp_TxnRef !== r.vnp_TxnRef ||
      data.vnp_Command !== 'querydr'
    )
      throw new BadRequestException('VNPay query response mismatch');
    return {
      ...observation(
        this.method,
        data,
        data.vnp_TxnRef,
        data.vnp_TransactionNo,
        Number(data.vnp_Amount) / 100,
        data.vnp_ResponseCode === '00' && data.vnp_TransactionType === '01'
          ? data.vnp_TransactionStatus
          : 'UNKNOWN',
      ),
      merchantId: String(data.vnp_TmnCode),
    };
  }
  callback(raw: string | Record<string, any>): Observation {
    const r = input(raw);
    verify(
      r.vnp_SecureHash,
      sign(required(this.env, 'VNPAY_HASH_SECRET'), vnpData(r), 'sha512'),
    );
    if (r.vnp_TmnCode !== required(this.env, 'VNPAY_TMN_CODE'))
      throw new BadRequestException('Invalid VNPay merchant');
    return {
      ...observation(
        this.method,
        r,
        r.vnp_TxnRef,
        r.vnp_TransactionNo,
        Number(r.vnp_Amount) / 100,
        r.vnp_ResponseCode === '00' ? r.vnp_TransactionStatus : 'UNKNOWN',
      ),
      code: String(r.vnp_ResponseCode),
      subCode: String(r.vnp_TransactionStatus),
      merchantId: String(r.vnp_TmnCode),
    };
  }
}
export class ZalopayAdapter implements GatewayAdapter {
  method: Gateway = 'ZALOPAY';
  constructor(
    private env: Record<string, string>,
    private http: GatewayHttp,
  ) {}
  prepare(a: Attempt, now: Date): Record<string, any> {
    const r = {
      app_id: Number(required(this.env, 'ZALOPAY_APP_ID')),
      app_user: a.userId,
      app_trans_id: a.merchantReference,
      app_time: now.getTime(),
      amount: a.amount,
      description: `GlowUp ${a.id}`,
      callback_url: `${required(this.env, 'PAYMENT_PUBLIC_BASE_URL').replace(/\/+$/, '')}/payments/zalopay/callback`,
      item: '[]',
      embed_data: JSON.stringify({ redirecturl: a.returnUrl }),
      expire_duration_seconds: zaloDuration(a.expiresAt, now),
      bank_code: '',
    };
    return {
      ...r,
      mac: sign(
        required(this.env, 'ZALOPAY_KEY1'),
        [
          r.app_id,
          r.app_trans_id,
          r.app_user,
          r.amount,
          r.app_time,
          r.embed_data,
          r.item,
        ].join('|'),
      ),
    };
  }
  async create(r: Record<string, any>, a: Attempt): Promise<Creation> {
    const data = await this.http(
      this.env.ZALOPAY_CREATE_URL || 'https://sb-openapi.zalopay.vn/v2/create',
      r,
      true,
    );
    return {
      status:
        String(data.return_code) === '1' && data.order_url
          ? 'PAYABLE'
          : ['-401', '-402'].includes(String(data.sub_return_code))
            ? 'FAILED'
            : 'UNKNOWN',
      paymentUrl: data.order_url || null,
      walletDeeplink: null,
      qrCodeData: data.qr_code || null,
      payload: data,
    };
  }
  async query(a: Attempt): Promise<Observation> {
    const appId = required(this.env, 'ZALOPAY_APP_ID');
    const key = required(this.env, 'ZALOPAY_KEY1');
    const data = await this.http(
      this.env.ZALOPAY_QUERY_URL || 'https://sb-openapi.zalopay.vn/v2/query',
      {
        app_id: Number(appId),
        app_trans_id: a.merchantReference,
        mac: sign(key, `${appId}|${a.merchantReference}|${key}`),
      },
      true,
    );
    return {
      ...observation(
        this.method,
        data,
        a.merchantReference,
        data.zp_trans_id,
        data.amount,
        data.return_code,
        String(data.sub_return_code ?? ''),
      ),
      merchantId: appId,
    };
  }
  callback(raw: string | Record<string, any>): Observation {
    const r = input(raw);
    if (String(r.type) !== '1' || typeof r.data !== 'string')
      throw new BadRequestException('Invalid ZaloPay callback type');
    verify(r.mac, sign(required(this.env, 'ZALOPAY_KEY2'), r.data));
    const data = parseGatewayJson(r.data);
    if (String(data.app_id) !== required(this.env, 'ZALOPAY_APP_ID'))
      throw new BadRequestException('Invalid ZaloPay merchant');
    return {
      ...observation(
        this.method,
        r,
        data.app_trans_id,
        data.zp_trans_id,
        data.amount,
        '1',
      ),
      merchantId: String(data.app_id),
    };
  }
}
