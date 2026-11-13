import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import {
  allowedRefundMethods,
  assertRefundMethodAllowed,
  assertRefundProcessable,
  assertRefundRejectable,
  canHandleRefund,
} from '../refund-rules';

describe('refund-rules', () => {
  describe('allowedRefundMethods', () => {
    it('Quản lý: chỉ tiền mặt, khoản gốc COD/CASH và đang mở ca tại cửa hàng của đơn', () => {
      expect(allowedRefundMethods('STORE', 'COD', true)).toEqual(['CASH']);
      expect(allowedRefundMethods('STORE', 'CASH', true)).toEqual(['CASH']);
      expect(allowedRefundMethods('STORE', 'COD', false)).toEqual([]);
      expect(allowedRefundMethods('STORE', 'SEPAY', true)).toEqual([]);
      expect(allowedRefundMethods('STORE', null, true)).toEqual([]);
    });
    it('Kế toán/Admin: luôn chuyển khoản; tiền mặt chỉ khi khoản gốc tiền mặt và đang mở ca', () => {
      expect(allowedRefundMethods('ALL', 'COD', true)).toEqual(['CASH', 'BANK_TRANSFER']);
      expect(allowedRefundMethods('ALL', 'COD', false)).toEqual(['BANK_TRANSFER']);
      expect(allowedRefundMethods('ALL', 'SEPAY', true)).toEqual(['BANK_TRANSFER']);
    });
    it('phạm vi SELF không xử lý được', () => {
      expect(allowedRefundMethods('SELF', 'COD', true)).toEqual([]);
    });
  });

  it('canHandleRefund: Quản lý chỉ thấy nút với khoản gốc tiền mặt', () => {
    expect(canHandleRefund('STORE', 'COD')).toBe(true);
    expect(canHandleRefund('STORE', 'SEPAY')).toBe(false);
    expect(canHandleRefund('ALL', 'SEPAY')).toBe(true);
    expect(canHandleRefund('SELF', 'COD')).toBe(false);
  });

  describe('assertRefundMethodAllowed', () => {
    const base = { originalPaymentMethod: 'COD', hasOpenSessionAtStore: true } as const;
    it('Quản lý không chuyển khoản được', () => {
      expect(() =>
        assertRefundMethodAllowed({ ...base, scopeType: 'STORE', method: 'BANK_TRANSFER', reference: 'FT123' }),
      ).toThrow(ForbiddenException);
    });
    it('Quản lý không hoàn khoản gốc SePay', () => {
      expect(() =>
        assertRefundMethodAllowed({ ...base, scopeType: 'STORE', originalPaymentMethod: 'SEPAY', method: 'CASH' }),
      ).toThrow(ForbiddenException);
    });
    it('khoản gốc SePay không hoàn tiền mặt, kể cả Admin', () => {
      expect(() =>
        assertRefundMethodAllowed({ ...base, scopeType: 'ALL', originalPaymentMethod: 'SEPAY', method: 'CASH' }),
      ).toThrow(/chuyển khoản/);
    });
    it('tiền mặt cần đang mở ca POS tại cửa hàng của đơn', () => {
      expect(() =>
        assertRefundMethodAllowed({ ...base, scopeType: 'STORE', method: 'CASH', hasOpenSessionAtStore: false }),
      ).toThrow(BadRequestException);
    });
    it('chuyển khoản bắt buộc mã tham chiếu', () => {
      expect(() =>
        assertRefundMethodAllowed({ ...base, scopeType: 'ALL', method: 'BANK_TRANSFER' }),
      ).toThrow(BadRequestException);
      expect(() =>
        assertRefundMethodAllowed({ ...base, scopeType: 'ALL', method: 'BANK_TRANSFER', reference: 'FT26110912345' }),
      ).not.toThrow();
    });
    it('tiền mặt tại quầy không cần mã tham chiếu', () => {
      expect(() => assertRefundMethodAllowed({ ...base, scopeType: 'STORE', method: 'CASH' })).not.toThrow();
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
