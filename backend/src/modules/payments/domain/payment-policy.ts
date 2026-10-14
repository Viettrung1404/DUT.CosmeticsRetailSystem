import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
export type Gateway = 'VNPAY' | 'MOMO' | 'ZALOPAY';
export type GatewayState =
  'PAID' | 'PAYABLE' | 'PENDING' | 'FAILED' | 'UNKNOWN';
export const ONLINE_METHODS: Gateway[] = ['VNPAY', 'MOMO', 'ZALOPAY'];
export function validatePaymentAmount(
  method: string,
  amount: number,
  env: Record<string, string | undefined> = process.env,
): void {
  if (method === 'COD') return;
  if (!ONLINE_METHODS.includes(method as Gateway))
    throw new BadRequestException('Phương thức thanh toán không được hỗ trợ');
  if (
    method === 'ZALOPAY' &&
    (!env.ZALOPAY_MIN_AMOUNT || !env.ZALOPAY_MAX_AMOUNT)
  ) {
    throw new ServiceUnavailableException(
      'ZaloPay chưa xác nhận hạn mức merchant',
    );
  }
  const min = Math.max(
    method === 'MOMO' ? 1000 : method === 'VNPAY' ? 5000 : 1,
    Number(env[`${method}_MIN_AMOUNT`] || 1),
  );
  const max = Math.min(
    50_000_000,
    Number(env[`${method}_MAX_AMOUNT`] || 50_000_000),
  );
  if (
    !Number.isSafeInteger(min) ||
    !Number.isSafeInteger(max) ||
    min > max ||
    min < 1
  )
    throw new ServiceUnavailableException(
      'Cấu hình hạn mức thanh toán không hợp lệ',
    );
  if (!Number.isSafeInteger(amount) || amount < min || amount > max) {
    throw new BadRequestException({
      code: 'PAYMENT_AMOUNT_OUT_OF_RANGE',
      message: `${method} chấp nhận số tiền nguyên từ ${min.toLocaleString('vi-VN')} đến ${max.toLocaleString('vi-VN')} VND. Vui lòng chọn phương thức khác.`,
      min,
      max,
    });
  }
}
export function gatewayState(
  method: Gateway,
  code: string,
  subCode = '',
): GatewayState {
  if (method === 'MOMO') {
    if (code === '0') return 'PAID';
    if (['9000', '1000', '7000', '7002'].includes(code)) return 'PENDING';
    if (
      [
        '1001',
        '1002',
        '1003',
        '1004',
        '1005',
        '1006',
        '1007',
        '1017',
        '1026',
        '4001',
        '4002',
        '4100',
      ].includes(code)
    )
      return 'FAILED';
  }
  if (method === 'VNPAY') {
    if (code === '00') return 'PAID';
    if (code === '02') return 'FAILED';
    if (code === '01') return 'PENDING';
  }
  if (method === 'ZALOPAY') {
    if (code === '1') return 'PAID';
    if (code === '3') return 'PENDING';
    if (code === '2' && subCode === '-63') return 'PAYABLE';
    if (code === '2' && subCode === '-54') return 'FAILED';
  }
  return 'UNKNOWN';
}
export function canConfirm(
  expiresAt: Date,
  receiptAt: Date | null,
  now: Date,
  orderStatus: string,
): boolean {
  return (
    orderStatus === 'PENDING' &&
    receiptAt !== null &&
    receiptAt.getTime() < expiresAt.getTime() &&
    now.getTime() < expiresAt.getTime() + 60_000
  );
}
export function zaloDuration(expiresAt: Date, now: Date): number {
  const seconds = Math.floor((expiresAt.getTime() - now.getTime()) / 1000);
  if (seconds < 300)
    throw new BadRequestException({
      code: 'PAYMENT_WINDOW_TOO_SHORT',
      message:
        'ZaloPay cần ít nhất 5 phút. Vui lòng hủy đơn hiện tại trước khi đặt lại; nếu đang xác minh, hãy kiểm tra trạng thái.',
    });
  return Math.min(seconds, 2592000);
}
