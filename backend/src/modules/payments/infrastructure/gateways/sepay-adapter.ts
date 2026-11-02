import {
  BadRequestException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
import {
  Attempt,
  Creation,
  GatewayAdapter,
  Observation,
  parseGatewayJson,
} from './gateway-adapters';

export type SepayGet = (url: string) => Promise<Record<string, any>>;

// Only these fixed provider endpoints receive the API token.
export function sepayApiBase(env: Record<string, string | undefined>): string {
  if (!['sandbox', 'live'].includes(env.SEPAY_MODE || ''))
    throw new ServiceUnavailableException('SEPAY_MODE must be sandbox or live');
  if (env.NODE_ENV === 'production' && env.SEPAY_MODE !== 'live')
    throw new ServiceUnavailableException(
      'SePay sandbox is disabled in production',
    );
  return env.SEPAY_MODE === 'live'
    ? 'https://userapi.sepay.vn/v2'
    : 'https://userapi-sandbox.sepay.vn/v2';
}

export function createSepayTransport(
  env: Record<string, string | undefined>,
): SepayGet {
  const starts: number[] = [];
  let blockedUntil = 0;
  return async (url) => {
    const base = sepayApiBase(env);
    const qps = Number(env.SEPAY_MAX_QPS);
    const now = Date.now();
    while (starts.length && starts[0] <= now - 1000) starts.shift();
    if (
      !url.startsWith(`${base}/transactions?`) ||
      !env.SEPAY_API_TOKEN ||
      !Number.isInteger(qps) ||
      qps < 1 ||
      qps > 3 ||
      starts.length >= qps ||
      now < blockedUntil
    )
      throw new ServiceUnavailableException(
        'SePay query unavailable; retry later',
      );
    starts.push(now);
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${env.SEPAY_API_TOKEN}`,
        Accept: 'application/json',
      },
      redirect: 'error',
      signal: AbortSignal.timeout(10000),
    });
    if (response.status === 429) {
      const seconds = Number(response.headers.get('retry-after') || 1);
      blockedUntil =
        Date.now() +
        (Number.isFinite(seconds) ? Math.max(1, seconds) : 1) * 1000;
    }
    if (!response.ok)
      throw new ServiceUnavailableException('SePay query failed');
    const raw = await response.text();
    if (raw.length > 256 * 1024)
      throw new ServiceUnavailableException('SePay response too large');
    return parseGatewayJson(raw);
  };
}

export class SepayAdapter implements GatewayAdapter {
  readonly method = 'SEPAY' as const;
  constructor(
    private readonly env: Record<string, string | undefined>,
    private readonly get: SepayGet,
  ) {}

  prepare(a: Attempt): Record<string, any> {
    return {
      accountNumber: this.env.SEPAY_ACCOUNT_NUMBER,
      bankAccountId: this.env.SEPAY_BANK_ACCOUNT_ID,
      bank: this.env.SEPAY_BANK_CODE,
      accountName: this.env.SEPAY_ACCOUNT_NAME,
      amount: a.amount,
      content: a.merchantReference,
      mode: this.env.SEPAY_MODE,
    };
  }
  async create(request: Record<string, any>): Promise<Creation> {
    const image = new URL('https://vietqr.app/img');
    for (const [key, value] of Object.entries({
      acc: request.accountNumber,
      bank: request.bank,
      amount: request.amount,
      des: request.content,
      template: 'compact',
      holder: request.accountName,
    }))
      image.searchParams.set(key, String(value));
    return {
      status: 'PAYABLE',
      paymentUrl: null,
      walletDeeplink: null,
      qrCodeData: JSON.stringify({ ...request, imageUrl: image.href }),
      payload: {},
    };
  }

  verifyWebhook(raw: string, signature: string, timestamp: string): void {
    const secret = this.env.SEPAY_WEBHOOK_SECRET;
    if (!secret)
      throw new ServiceUnavailableException('SePay webhook is not configured');
    if (
      !/^\d{10}$/.test(timestamp) ||
      Math.abs(Date.now() / 1000 - Number(timestamp)) > 300
    )
      throw new UnauthorizedException('Expired SePay webhook');
    const expected = `sha256=${createHmac('sha256', secret).update(`${timestamp}.${raw}`).digest('hex')}`;
    if (
      !/^sha256=[a-f0-9]{64}$/.test(signature) ||
      !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
    )
      throw new UnauthorizedException('Invalid SePay signature');
  }
  private reference(code: unknown, content: unknown): string {
    const matches =
      String(content ?? '')
        .toUpperCase()
        .match(/(?<![A-Z0-9])GU[A-F0-9]{32}(?![A-Z0-9])/g) || [];
    const values = new Set(matches);
    if (typeof code === 'string' && /^GU[A-F0-9]{32}$/i.test(code))
      values.add(code.toUpperCase());
    if (values.size !== 1)
      throw new BadRequestException('Missing or ambiguous SePay payment code');
    return [...values][0];
  }
  private paid(
    payload: Record<string, any>,
    reference: string,
    transactionId: unknown,
    amount: unknown,
    account: unknown,
  ): Observation {
    const id = String(transactionId ?? '');
    if (
      String(account) !== this.env.SEPAY_ACCOUNT_NUMBER ||
      !/^[A-Za-z0-9._/-]{1,100}$/.test(id) ||
      !Number.isSafeInteger(Number(amount)) ||
      Number(amount) <= 0
    )
      throw new BadRequestException('Invalid SePay transaction');
    return {
      gateway: 'SEPAY',
      merchantReference: reference,
      transactionId: id,
      amount: Number(amount),
      state: 'PAID',
      code: 'PAID',
      subCode: '',
      kind: 'TRANSFER',
      merchantId: String(account),
      payload,
    };
  }
  // Controller must authenticate the original bytes before calling this parser.
  callback(raw: string | Record<string, any>): Observation {
    const p = typeof raw === 'string' ? parseGatewayJson(raw) : raw;
    if (p.transferType !== 'in')
      throw new BadRequestException('Not an incoming transfer');
    return this.paid(
      p,
      this.reference(p.code, p.content),
      p.referenceCode,
      p.transferAmount,
      p.accountNumber,
    );
  }
  async query(a: Attempt): Promise<Observation> {
    const params = new URLSearchParams({
      q: a.merchantReference,
      bank_account_id: this.env.SEPAY_BANK_ACCOUNT_ID!,
      transfer_type: 'in',
      per_page: '100',
      page: '1',
    });
    // A bank reference is stable across the numeric webhook ID and API v2 UUID.
    if (a.transactionId) params.set('reference_number', a.transactionId);
    const r = await this.get(
      `${sepayApiBase(this.env)}/transactions?${params}`,
    );
    if (r.status !== 'success' || !Array.isArray(r.data))
      throw new ServiceUnavailableException('Invalid SePay query response');
    const matches = r.data.filter((p: Record<string, any>) => {
      try {
        return (
          p.transfer_type === 'in' &&
          p.bank_account_id === this.env.SEPAY_BANK_ACCOUNT_ID &&
          p.account_number === this.env.SEPAY_ACCOUNT_NUMBER &&
          Number(p.amount_out) === 0 &&
          this.reference(p.code, p.transaction_content) ===
            a.merchantReference &&
          (!a.transactionId || p.reference_number === a.transactionId)
        );
      } catch {
        return false;
      }
    });
    if (r.meta?.pagination?.has_more === true || matches.length > 1)
      throw new ServiceUnavailableException(
        'Ambiguous SePay transactions; manual review required',
      );
    if (matches.length) {
      const p = matches[0];
      return this.paid(
        p,
        a.merchantReference,
        p.reference_number,
        p.amount_in,
        p.account_number,
      );
    }
    return {
      gateway: 'SEPAY',
      merchantReference: a.merchantReference,
      transactionId: '',
      amount: 0,
      state: 'PAYABLE',
      code: 'PENDING',
      subCode: '',
      kind: 'TRANSFER',
      merchantId: this.env.SEPAY_ACCOUNT_NUMBER,
      payload: {},
    };
  }
}
