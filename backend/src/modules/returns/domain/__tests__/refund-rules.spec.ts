import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import {
  allowedRefundMethods,
  assertRefundMethodAllowed,
  assertRefundProcessable,
  assertRefundRejectable,
} from '../refund-rules';

describe('refund-rules', () => {
  describe('allowedRefundMethods', () => {
    it('Quản lý cửa hàng (STORE): chỉ tiền mặt, chỉ khi khách đã trả COD/CASH', () => {
      expect(allowedRefundMethods('STORE', 'COD')).toEqual(['CASH']);
      expect(allowedRefundMethods('STORE', 'CASH')).toEqual(['CASH']);
      expect(allowedRefundMethods('STORE', 'SEPAY')).toEqual([]);
      expect(allowedRefundMethods('STORE', null)).toEqual([]);
    });
    it('Kế toán/Admin (ALL): theo khoản gốc', () => {
      expect(allowedRefundMethods('ALL', 'COD')).toEqual(['CASH', 'BANK_TRANSFER']);
      expect(allowedRefundMethods('ALL', 'SEPAY')).toEqual(['BANK_TRANSFER', 'GATEWAY_MANUAL']);
    });
    it('SELF: không được hoàn', () => {
      expect(allowedRefundMethods('SELF', 'COD')).toEqual([]);
    });
  });

  describe('assertRefundMethodAllowed', () => {
    it('Quản lý hoàn chuyển khoản -> 403', () => {
      expect(() =>
        assertRefundMethodAllowed({
          scopeType: 'STORE',
          originalPaymentMethod: 'COD',
          method: 'BANK_TRANSFER',
          reference: 'FT123',
        }),
      ).toThrow(ForbiddenException);
    });
    it('Quản lý hoàn khoản trả qua cổng -> 403', () => {
      expect(() =>
        assertRefundMethodAllowed({ scopeType: 'STORE', originalPaymentMethod: 'VNPAY', method: 'CASH' }),
      ).toThrow(ForbiddenException);
    });
    it('hoàn tiền mặt cho khoản gốc qua cổng -> 403 ngay cả với Admin', () => {
      expect(() =>
        assertRefundMethodAllowed({ scopeType: 'ALL', originalPaymentMethod: 'SEPAY', method: 'CASH' }),
      ).toThrow(ForbiddenException);
    });
    it('chuyển khoản/cổng bắt buộc có mã tham chiếu', () => {
      expect(() =>
        assertRefundMethodAllowed({ scopeType: 'ALL', originalPaymentMethod: 'SEPAY', method: 'BANK_TRANSFER' }),
      ).toThrow(BadRequestException);
      expect(() =>
        assertRefundMethodAllowed({
          scopeType: 'ALL',
          originalPaymentMethod: 'SEPAY',
          method: 'BANK_TRANSFER',
          reference: ' 1 ',
        }),
      ).toThrow(BadRequestException);
      expect(() =>
        assertRefundMethodAllowed({
          scopeType: 'ALL',
          originalPaymentMethod: 'SEPAY',
          method: 'BANK_TRANSFER',
          reference: 'FT26110912345',
        }),
      ).not.toThrow();
    });
    it('tiền mặt không cần mã tham chiếu', () => {
      expect(() =>
        assertRefundMethodAllowed({ scopeType: 'STORE', originalPaymentMethod: 'COD', method: 'CASH' }),
      ).not.toThrow();
    });
  });

  it('assertRefundProcessable: chờ/đang xử lý/đã từ chối thì xử lý được, đã hoàn thì 409', () => {
    for (const s of ['PENDING', 'PROCESSING', 'FAILED']) {
      expect(() => assertRefundProcessable(s)).not.toThrow();
    }
    expect(() => assertRefundProcessable('COMPLETED')).toThrow(ConflictException);
    expect(() => assertRefundProcessable('COMPLETED')).toThrow(/đã được hoàn/);
  });

  it('assertRefundRejectable: chỉ từ chối phiếu đang chờ', () => {
    expect(() => assertRefundRejectable('PENDING')).not.toThrow();
    expect(() => assertRefundRejectable('COMPLETED')).toThrow(ConflictException);
    expect(() => assertRefundRejectable('FAILED')).toThrow(ConflictException);
  });
});
