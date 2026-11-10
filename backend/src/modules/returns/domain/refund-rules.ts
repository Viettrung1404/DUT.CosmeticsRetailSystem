import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';

export const REFUND_METHODS = ['CASH', 'BANK_TRANSFER'] as const;
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

// Tiền vào kênh nào hoàn về kênh đó: tiền mặt chỉ hoàn cho khoản gốc tiền mặt/COD, tại quầy khi người hoàn đang mở ca ở cửa hàng của đơn
export function canHandleRefund(scopeType: 'ALL' | 'STORE' | 'SELF', originalPaymentMethod: string | null): boolean {
  if (scopeType === 'ALL') return true;
  return scopeType === 'STORE' && isCashPayment(originalPaymentMethod);
}

export function allowedRefundMethods(
  scopeType: 'ALL' | 'STORE' | 'SELF',
  originalPaymentMethod: string | null,
  hasOpenSessionAtStore: boolean,
): RefundMethod[] {
  if (!canHandleRefund(scopeType, originalPaymentMethod)) return [];
  const cash: RefundMethod[] = isCashPayment(originalPaymentMethod) && hasOpenSessionAtStore ? ['CASH'] : [];
  return scopeType === 'ALL' ? [...cash, 'BANK_TRANSFER'] : cash;
}

export function assertRefundMethodAllowed(params: {
  scopeType: 'ALL' | 'STORE' | 'SELF';
  originalPaymentMethod: string | null;
  method: RefundMethod;
  hasOpenSessionAtStore: boolean;
  reference?: string | null;
}): void {
  if (!canHandleRefund(params.scopeType, params.originalPaymentMethod)) {
    throw new ForbiddenException(
      params.scopeType === 'STORE'
        ? 'Quản lý cửa hàng chỉ hoàn tiền mặt cho khoản khách đã trả tiền mặt/COD; các khoản khác do Kế toán chuyển khoản'
        : 'Bạn không có quyền xử lý phiếu hoàn tiền này',
    );
  }
  if (params.method === 'CASH') {
    if (!isCashPayment(params.originalPaymentMethod)) {
      throw new ForbiddenException('Khoản gốc thanh toán qua ngân hàng nên phải hoàn bằng chuyển khoản');
    }
    if (!params.hasOpenSessionAtStore) {
      throw new BadRequestException('Cần mở ca POS tại cửa hàng của đơn để hoàn tiền mặt cho khách tại quầy');
    }
    return;
  }
  if (params.scopeType !== 'ALL') {
    throw new ForbiddenException('Quản lý cửa hàng chỉ hoàn tiền mặt tại quầy; chuyển khoản do Kế toán xử lý');
  }
  if ((params.reference ?? '').trim().length < 3) {
    throw new BadRequestException('Hoàn qua chuyển khoản cần nhập mã tham chiếu giao dịch');
  }
}
