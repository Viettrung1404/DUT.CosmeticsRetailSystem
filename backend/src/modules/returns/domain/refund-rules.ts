import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';

export const REFUND_METHODS = ['CASH', 'BANK_TRANSFER', 'GATEWAY_MANUAL'] as const;
export type RefundMethod = (typeof REFUND_METHODS)[number];

const CASH_PAYMENT_METHODS = ['COD', 'CASH'];
const PROCESSABLE = ['PENDING', 'PROCESSING', 'FAILED'];

export const isCashPayment = (paymentMethod: string | null | undefined) =>
  !!paymentMethod && CASH_PAYMENT_METHODS.includes(paymentMethod);

export function assertRefundProcessable(status: string): void {
  if (!PROCESSABLE.includes(status)) {
    throw new ConflictException(
      status === 'COMPLETED' ? 'Phiếu hoàn tiền này đã được hoàn' : 'Phiếu hoàn tiền không ở trạng thái xử lý được',
    );
  }
}

export function assertRefundRejectable(status: string): void {
  if (!['PENDING', 'PROCESSING'].includes(status)) {
    throw new ConflictException('Chỉ từ chối được phiếu hoàn tiền đang chờ xử lý');
  }
}

// Phương thức hoàn mà người dùng với phạm vi dữ liệu này được chọn cho khoản thanh toán gốc
export function allowedRefundMethods(
  scopeType: 'ALL' | 'STORE' | 'SELF',
  originalPaymentMethod: string | null,
): RefundMethod[] {
  if (scopeType === 'SELF') return [];
  const cashOriginal = isCashPayment(originalPaymentMethod);
  if (scopeType === 'STORE') return cashOriginal ? ['CASH'] : [];
  return cashOriginal ? ['CASH', 'BANK_TRANSFER'] : ['BANK_TRANSFER', 'GATEWAY_MANUAL'];
}

export function assertRefundMethodAllowed(params: {
  scopeType: 'ALL' | 'STORE' | 'SELF';
  originalPaymentMethod: string | null;
  method: RefundMethod;
  reference?: string | null;
}): void {
  const allowed = allowedRefundMethods(params.scopeType, params.originalPaymentMethod);
  if (!allowed.includes(params.method)) {
    throw new ForbiddenException(
      params.scopeType === 'STORE'
        ? 'Quản lý cửa hàng chỉ hoàn tiền mặt cho khoản khách đã trả tiền mặt/COD; các khoản khác do Kế toán xử lý'
        : 'Phương thức hoàn tiền không phù hợp với khoản thanh toán gốc',
    );
  }
  if (params.method !== 'CASH' && (params.reference ?? '').trim().length < 3) {
    throw new BadRequestException('Hoàn qua chuyển khoản/cổng thanh toán cần nhập mã tham chiếu giao dịch');
  }
}
