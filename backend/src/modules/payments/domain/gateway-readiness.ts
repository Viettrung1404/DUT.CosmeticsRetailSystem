import { ServiceUnavailableException } from '@nestjs/common';
import { sepayApiBase } from '../infrastructure/gateways/sepay-adapter';
export function gatewayAvailable(method: string): boolean {
  try {
    assertGatewayReady(method);
    return true;
  } catch (error) {
    if (error instanceof ServiceUnavailableException) return false;
    throw error;
  }
}

export function assertGatewayReady(method: string): void {
  if (method === 'COD') return;
  const keys: Record<string, string[]> = {
    SEPAY: [
      'SEPAY_API_TOKEN',
      'SEPAY_WEBHOOK_SECRET',
      'SEPAY_ACCOUNT_NUMBER',
      'SEPAY_BANK_ACCOUNT_ID',
      'SEPAY_BANK_CODE',
      'SEPAY_ACCOUNT_NAME',
    ],
    MOMO: ['MOMO_PARTNER_CODE', 'MOMO_ACCESS_KEY', 'MOMO_SECRET_KEY'],
    VNPAY: ['VNPAY_TMN_CODE', 'VNPAY_HASH_SECRET'],
    ZALOPAY: [
      'ZALOPAY_APP_ID',
      'ZALOPAY_KEY1',
      'ZALOPAY_KEY2',
      'ZALOPAY_MIN_AMOUNT',
      'ZALOPAY_MAX_AMOUNT',
      'ZALOPAY_CALLBACK_TIMEOUT_MS',
    ],
  };
  if (method === 'SEPAY') sepayApiBase(process.env);
  const qps = Number(process.env[`${method}_MAX_QPS`]);
  const https = (key: string) => {
    try {
      const url = new URL(process.env[key] || '');
      return (
        url.protocol === 'https:' &&
        !url.username &&
        !url.password &&
        !url.hash &&
        !url.search
      );
    } catch {
      return false;
    }
  };
  const callbackTimeout = Number(process.env.ZALOPAY_CALLBACK_TIMEOUT_MS);
  if (
    !keys[method] ||
    process.env.PAYMENT_WORKER_ENABLED === 'false' ||
    process.env[`${method}_ENABLED`] !== 'true' ||
    !Number.isInteger(qps) ||
    qps < 1 ||
    (method === 'SEPAY' &&
      (qps > 3 ||
        !/^[A-Za-z0-9]{1,19}$/.test(process.env.SEPAY_ACCOUNT_NUMBER || '') ||
        !/^[0-9a-f-]{36}$/i.test(process.env.SEPAY_BANK_ACCOUNT_ID || ''))) ||
    keys[method].some((k) => !process.env[k]) ||
    !https('PAYMENT_PUBLIC_BASE_URL') ||
    !https('PAYMENT_WEB_RETURN_URL') ||
    (method === 'ZALOPAY' &&
      (!Number.isInteger(callbackTimeout) || callbackTimeout < 2000))
  ) {
    throw new ServiceUnavailableException({
      code: 'PAYMENT_GATEWAY_NOT_READY',
      message: `Thanh toán qua ${method} hiện chưa khả dụng. Vui lòng chọn phương thức khác.`,
    });
  }
}
