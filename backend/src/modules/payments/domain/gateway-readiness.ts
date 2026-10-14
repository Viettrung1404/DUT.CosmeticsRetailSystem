import { ServiceUnavailableException } from '@nestjs/common';
export function assertGatewayReady(method: string): void {
  if (method === 'COD') return;
  const keys: Record<string, string[]> = {
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
    process.env[`${method}_ENABLED`] !== 'true' ||
    !Number.isInteger(qps) ||
    qps < 1 ||
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
