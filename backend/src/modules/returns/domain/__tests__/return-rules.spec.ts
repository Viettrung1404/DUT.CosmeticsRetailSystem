import { ConflictException } from '@nestjs/common';
import {
  assertReturnTransition,
  assertWithinCap,
  isBatchExpired,
  pickRestockBatch,
  returnActions,
  returnCashCap,
} from '../return-rules';

describe('return-rules', () => {
  describe('assertReturnTransition', () => {
    it.each([
      ['REQUESTED', 'APPROVED'],
      ['REQUESTED', 'REJECTED'],
      ['APPROVED', 'RECEIVED'],
      ['APPROVED', 'REJECTED'],
      ['RECEIVED', 'INSPECTED'],
      ['RECEIVED', 'REJECTED'],
      ['INSPECTED', 'COMPLETED'],
    ])('cho phép %s -> %s', (from, to) => {
      expect(() => assertReturnTransition(from, to)).not.toThrow();
    });

    it.each([
      ['REQUESTED', 'RECEIVED'],
      ['REQUESTED', 'INSPECTED'],
      ['APPROVED', 'INSPECTED'],
      ['INSPECTED', 'REJECTED'],
      ['COMPLETED', 'APPROVED'],
      ['REJECTED', 'APPROVED'],
      ['COMPLETED', 'COMPLETED'],
    ])('chặn %s -> %s bằng 409 tiếng Việt', (from, to) => {
      expect(() => assertReturnTransition(from, to)).toThrow(ConflictException);
      expect(() => assertReturnTransition(from, to)).toThrow(/Không thể chuyển/);
    });
  });

  describe('returnActions', () => {
    it('REQUESTED chỉ duyệt hoặc từ chối', () => {
      expect(returnActions('REQUESTED')).toEqual({
        canApprove: true,
        canReject: true,
        canReceive: false,
        canInspect: false,
        canComplete: false,
      });
    });
    it('INSPECTED chỉ hoàn tất; trạng thái cuối không còn thao tác nào', () => {
      expect(returnActions('INSPECTED').canComplete).toBe(true);
      expect(returnActions('INSPECTED').canReject).toBe(false);
      expect(Object.values(returnActions('COMPLETED')).some(Boolean)).toBe(false);
      expect(Object.values(returnActions('REJECTED')).some(Boolean)).toBe(false);
    });
  });

  describe('returnCashCap', () => {
    it('trả hàng: bằng tổng giá trị các dòng', () => {
      expect(returnCashCap('REFUND', 450000, null)).toBe(450000);
    });
    it('đổi hàng chưa chấp nhận báo giá: 0', () => {
      expect(returnCashCap('EXCHANGE', 450000, null)).toBe(0);
    });
    it('đổi hàng đã chấp nhận: phần dư cần hoàn; đơn đổi bị hủy: hoàn toàn bộ giá trị trả', () => {
      const active = { status: 'ACTIVE', refundDue: 50000, returnCredit: 450000 };
      expect(returnCashCap('EXCHANGE', 450000, active)).toBe(50000);
      expect(returnCashCap('EXCHANGE', 450000, { ...active, status: 'CANCELLED' })).toBe(450000);
    });
  });

  describe('assertWithinCap', () => {
    it('đúng bằng hạn mức thì được', () => {
      expect(() =>
        assertWithinCap({ amount: 100000, othersActive: 50000, cap: 150000, label: 'x' }),
      ).not.toThrow();
    });
    it('vượt một đồng cũng bị chặn', () => {
      expect(() =>
        assertWithinCap({ amount: 100000.01, othersActive: 50000, cap: 150000, label: 'giá trị hàng' }),
      ).toThrow(/vượt quá giá trị hàng/);
    });
    it('không dính sai số số thực', () => {
      expect(() =>
        assertWithinCap({ amount: 0.2, othersActive: 0.1, cap: 0.3, label: 'x' }),
      ).not.toThrow();
    });
  });

  describe('pickRestockBatch', () => {
    const now = new Date('2026-11-09T03:00:00Z');
    it('chọn lô còn hạn đã xuất nhiều nhất', () => {
      expect(
        pickRestockBatch(
          [
            { id: 'a', quantity: 2, expiryDate: new Date('2027-05-01') },
            { id: 'b', quantity: 5, expiryDate: new Date('2027-06-01') },
          ],
          now,
        ),
      ).toBe('b');
    });
    it('bỏ qua lô đã hết hạn', () => {
      expect(
        pickRestockBatch(
          [
            { id: 'old', quantity: 9, expiryDate: new Date('2026-10-01') },
            { id: 'ok', quantity: 1, expiryDate: new Date('2027-01-01') },
          ],
          now,
        ),
      ).toBe('ok');
    });
    it('không có lô còn hạn thì trả null', () => {
      expect(pickRestockBatch([], now)).toBeNull();
      expect(pickRestockBatch([{ id: 'x', quantity: 1, expiryDate: new Date('2026-01-01') }], now)).toBeNull();
    });
  });

  it('isBatchExpired: hạn là hôm nay vẫn còn dùng được', () => {
    const now = new Date(2026, 10, 9, 15, 0, 0);
    expect(isBatchExpired(new Date(2026, 10, 9), now)).toBe(false);
    expect(isBatchExpired(new Date(2026, 10, 8), now)).toBe(true);
  });
});
