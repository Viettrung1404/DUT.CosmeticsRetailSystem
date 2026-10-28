import { ServiceUnavailableException } from '@nestjs/common';

export interface RewardPolicy {
  code: string;
  version: string;
  pointsCost: number;
  discountValue: number;
  discountType: 'FIXED_AMOUNT' | 'PERCENTAGE';
  minOrderAmount: number;
  validityDays: number;
}
export interface ReturnPolicy {
  version: string;
  allocation: 'PROPORTIONAL';
  refundPointsAs: 'POINTS';
  exchangeShippingFee: number;
  quoteMinutes: number;
  allowDifferenceCod: boolean;
}
export function configuration<T>(
  value: unknown,
  valid: (v: any) => boolean,
  name: string,
): T {
  if (!value || typeof value !== 'object' || !valid(value)) {
    throw new ServiceUnavailableException({
      code: 'POLICY_NOT_CONFIGURED',
      message: `${name} chưa được cấu hình hợp lệ`,
    });
  }
  return value as T;
}
export const positiveInt = (n: unknown): n is number =>
  typeof n === 'number' && Number.isSafeInteger(n) && n > 0;
export const validReward = (r: any): r is RewardPolicy =>
  r &&
  typeof r.code === 'string' &&
  r.code.length > 0 &&
  r.code.length <= 60 &&
  typeof r.version === 'string' &&
  positiveInt(r.pointsCost) &&
  positiveInt(r.validityDays) &&
  Number.isFinite(r.minOrderAmount) &&
  r.minOrderAmount >= 0 &&
  Number.isFinite(r.discountValue) &&
  r.discountValue > 0 &&
  (r.discountType === 'FIXED_AMOUNT' ||
    (r.discountType === 'PERCENTAGE' && r.discountValue <= 100));
export const validReturnPolicy = (r: any): r is ReturnPolicy =>
  r &&
  typeof r.version === 'string' &&
  r.allocation === 'PROPORTIONAL' &&
  r.refundPointsAs === 'POINTS' &&
  Number.isFinite(r.exchangeShippingFee) &&
  r.exchangeShippingFee >= 0 &&
  positiveInt(r.quoteMinutes) &&
  r.quoteMinutes <= 1440 &&
  typeof r.allowDifferenceCod === 'boolean';
