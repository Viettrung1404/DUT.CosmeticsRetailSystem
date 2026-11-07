import {
  canConfirm,
  gatewayState,
  validatePaymentAmount,
  zaloDuration,
} from '../payment-policy';

describe('Payment safety rules', () => {
  it.each([
    ['MOMO', 1000],
    ['VNPAY', 5000],
    ['MOMO', 50_000_000],
  ])(
    'accepts %s at its actual limit, without a 100k minimum',
    (method, amount) => {
      expect(() =>
        validatePaymentAmount(method as string, amount as number),
      ).not.toThrow();
    },
  );
  it.each([
    ['MOMO', 999],
    ['VNPAY', 4999],
    ['MOMO', 50_000_001],
    ['MOMO', 1000.5],
    ['VNPAY', NaN],
    ['BANK', 10000],
  ])('rejects unsupported or invalid %s amount %s', (method, amount) => {
    expect(() =>
      validatePaymentAmount(method as string, amount as number),
    ).toThrow();
  });
  it('requires confirmed ZaloPay merchant limits', () => {
    expect(() => validatePaymentAmount('ZALOPAY', 1000, {})).toThrow('hạn mức');
    expect(() =>
      validatePaymentAmount('ZALOPAY', 1000, {
        ZALOPAY_MIN_AMOUNT: '1000',
        ZALOPAY_MAX_AMOUNT: '50000000',
      }),
    ).not.toThrow();
  });
  it('enforces a lower merchant maximum', () => {
    expect(() =>
      validatePaymentAmount('MOMO', 2000, { MOMO_MAX_AMOUNT: '1500' }),
    ).toThrow('1.500');
  });
  it.each([
    ['MOMO', '9000', '', 'PENDING'],
    ['MOMO', '99', '', 'UNKNOWN'],
    ['MOMO', '0', '', 'PAID'],
    ['MOMO', '1006', '', 'FAILED'],
    ['VNPAY', '04', '', 'UNKNOWN'],
    ['VNPAY', '07', '', 'UNKNOWN'],
    ['VNPAY', '02', '', 'FAILED'],
    ['ZALOPAY', '2', '-63', 'PAYABLE'],
    ['ZALOPAY', '2', '-54', 'FAILED'],
  ])(
    'conservatively classifies %s/%s/%s as %s',
    (gateway, code, sub, expected) => {
      expect(gatewayState(gateway as any, code, sub)).toBe(expected);
    },
  );
  const expiry = new Date('2026-10-11T03:15:00Z');
  it('accepts a timely paid receipt only within the fixed 60 second verification window', () => {
    expect(
      canConfirm(
        expiry,
        new Date(expiry.getTime() - 1),
        new Date(expiry.getTime() + 59999),
        'PENDING',
      ),
    ).toBe(true);
    expect(canConfirm(expiry, expiry, expiry, 'PENDING')).toBe(false);
    expect(
      canConfirm(
        expiry,
        new Date(expiry.getTime() - 1),
        new Date(expiry.getTime() + 60000),
        'PENDING',
      ),
    ).toBe(false);
    expect(
      canConfirm(expiry, new Date(expiry.getTime() - 1), expiry, 'CANCELLED'),
    ).toBe(false);
  });
  it('never extends ZaloPay expiry and refuses creating below 300 seconds', () => {
    expect(zaloDuration(expiry, new Date(expiry.getTime() - 300001))).toBe(300);
    expect(() =>
      zaloDuration(expiry, new Date(expiry.getTime() - 299999)),
    ).toThrow('hủy');
  });
});
