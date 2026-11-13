import { ConflictException } from '@nestjs/common';

export const RETURN_CONDITIONS = ['RESALEABLE', 'DAMAGED'] as const;
export type ReturnCondition = (typeof RETURN_CONDITIONS)[number];

const STATUS_LABEL: Record<string, string> = {
  REQUESTED: 'Chờ duyệt',
  APPROVED: 'Đã duyệt',
  RECEIVED: 'Đã nhận hàng',
  INSPECTED: 'Đã kiểm định',
  COMPLETED: 'Hoàn tất',
  REJECTED: 'Đã từ chối',
};

const TRANSITIONS: Record<string, string[]> = {
  REQUESTED: ['APPROVED', 'REJECTED'],
  APPROVED: ['RECEIVED', 'REJECTED'],
  RECEIVED: ['INSPECTED', 'REJECTED'],
  INSPECTED: ['COMPLETED'],
  COMPLETED: [],
  REJECTED: [],
};

export const returnStatusLabel = (status: string) => STATUS_LABEL[status] ?? status;

export function assertReturnTransition(from: string, to: string): void {
  if (!(TRANSITIONS[from] ?? []).includes(to)) {
    throw new ConflictException(
      `Không thể chuyển yêu cầu đổi trả từ "${returnStatusLabel(from)}" sang "${returnStatusLabel(to)}"`,
    );
  }
}

export interface ReturnActions {
  canApprove: boolean;
  canReject: boolean;
  canReceive: boolean;
  canInspect: boolean;
  canComplete: boolean;
}

export function returnActions(status: string): ReturnActions {
  const next = TRANSITIONS[status] ?? [];
  return {
    canApprove: next.includes('APPROVED'),
    canReject: next.includes('REJECTED'),
    canReceive: next.includes('RECEIVED'),
    canInspect: next.includes('INSPECTED'),
    canComplete: next.includes('COMPLETED'),
  };
}

const cents = (n: number) => Math.round(n * 100);

// Tiền mặt tối đa được hoàn cho một yêu cầu: trả hàng = tổng giá trị dòng; đổi hàng = phần dư sau khi cấn trừ
export function returnCashCap(
  returnType: string,
  itemsCredit: number,
  settlement: { status: string; refundDue: number; returnCredit: number } | null,
): number {
  if (returnType !== 'EXCHANGE') return itemsCredit;
  if (!settlement) return 0;
  return settlement.status === 'CANCELLED' ? settlement.returnCredit : settlement.refundDue;
}

export function assertWithinCap(params: {
  amount: number;
  othersActive: number;
  cap: number;
  label: string;
}): void {
  if (cents(params.othersActive) + cents(params.amount) > cents(params.cap)) {
    throw new ConflictException(`Số tiền hoàn vượt quá ${params.label}`);
  }
}

export interface RestockCandidate {
  id: string;
  quantity: number;
  expiryDate: Date;
}

export const isBatchExpired = (expiryDate: Date, now = new Date()): boolean => {
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  return expiryDate.getTime() < startOfToday.getTime();
};

// Mặc định nhập lại đúng lô đã xuất bán nhiều nhất cho dòng này; lô hết hạn thì bỏ qua (BR-05)
export function pickRestockBatch(
  candidates: RestockCandidate[],
  now = new Date(),
): string | null {
  const valid = candidates
    .filter((c) => !isBatchExpired(c.expiryDate, now))
    .sort((a, b) => b.quantity - a.quantity);
  return valid[0]?.id ?? null;
}
