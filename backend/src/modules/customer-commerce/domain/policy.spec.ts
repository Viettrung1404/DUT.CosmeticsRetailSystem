import { configuration, validReward, validReturnPolicy } from './policy';

describe('Explicit commerce policy', () => {
  it('fails closed for missing or malformed policy', () => {
    expect(() =>
      configuration(null, validReturnPolicy, 'return_policy'),
    ).toThrow();
    expect(() =>
      configuration(
        { version: '1', exchangeShippingFee: -1 },
        validReturnPolicy,
        'return_policy',
      ),
    ).toThrow();
  });
  it('does not accept rewards without explicit validity, cost, or a valid percentage', () => {
    const reward = {
      code: 'R',
      version: '1',
      pointsCost: 100,
      validityDays: 30,
      discountType: 'PERCENTAGE',
      discountValue: 10,
      minOrderAmount: 0,
    };
    expect(validReward(reward)).toBe(true);
    expect(validReward({ ...reward, validityDays: undefined })).toBe(false);
    expect(validReward({ ...reward, discountValue: 101 })).toBe(false);
    expect(validReward({ ...reward, pointsCost: 1.5 })).toBe(false);
  });
});
