import { BadRequestException } from '@nestjs/common';
import { settlePayments } from '../pos-payment.util';

describe('settlePayments', () => {
  it('tiền mặt dư thì thối lại, amount là phần áp vào đơn', () => {
    const r = settlePayments(300000, [{ method: 'CASH', amount: 500000 }]);
    expect(r.change).toBe(200000);
    expect(r.payments).toEqual([{ method: 'CASH', amount: 300000, tenderedAmount: 500000 }]);
  });

  it('chia tiền mặt + chuyển khoản vừa đủ', () => {
    const r = settlePayments(300000, [
      { method: 'CASH', amount: 100000 },
      { method: 'TRANSFER', amount: 200000 },
    ]);
    expect(r.change).toBe(0);
    expect(r.payments).toEqual([
      { method: 'CASH', amount: 100000, tenderedAmount: 100000 },
      { method: 'TRANSFER', amount: 200000, tenderedAmount: null },
    ]);
  });

  it('thu dư nhờ chuyển khoản thì chặn', () => {
    expect(() => settlePayments(300000, [{ method: 'TRANSFER', amount: 350000 }])).toThrow(
      BadRequestException,
    );
  });

  it('chuyển khoản đúng số, tiền mặt thừa đủ thối', () => {
    const r = settlePayments(300000, [
      { method: 'TRANSFER', amount: 200000 },
      { method: 'CASH', amount: 150000 },
    ]);
    expect(r.change).toBe(50000);
    expect(r.payments.find((p) => p.method === 'CASH')).toEqual({
      method: 'CASH',
      amount: 100000,
      tenderedAmount: 150000,
    });
  });

  it('thu thiếu thì báo lỗi', () => {
    expect(() => settlePayments(300000, [{ method: 'CASH', amount: 299999 }])).toThrow('chưa đủ');
  });

  it('thối nhiều hơn tiền mặt khách đưa thì chặn', () => {
    expect(() =>
      settlePayments(300000, [
        { method: 'TRANSFER', amount: 290000 },
        { method: 'CASH', amount: 20000 },
      ]),
    ).not.toThrow();
    expect(() =>
      settlePayments(300000, [
        { method: 'TRANSFER', amount: 320000 },
        { method: 'CASH', amount: 10000 },
      ]),
    ).toThrow(BadRequestException);
  });

  it('phương thức khai báo trùng thì chặn', () => {
    expect(() =>
      settlePayments(100000, [
        { method: 'CASH', amount: 50000 },
        { method: 'CASH', amount: 50000 },
      ]),
    ).toThrow('một lần');
  });

  it('đơn 0đ không cần thu', () => {
    expect(settlePayments(0, [])).toEqual({ payments: [], totalReceived: 0, change: 0 });
    expect(() => settlePayments(0, [{ method: 'CASH', amount: 1000 }])).toThrow(BadRequestException);
  });
});
