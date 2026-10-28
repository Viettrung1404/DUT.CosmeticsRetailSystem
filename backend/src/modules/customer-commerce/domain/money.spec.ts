import { allocateMoney, partialValue, settlement } from './money';

describe('RMA monetary invariants', () => {
  it('allocates cents without losing or creating value', () => {
    expect(allocateMoney(0.05, [1, 1, 1])).toEqual([0.02, 0.02, 0.01]);
    expect(allocateMoney(100, [50, 50])).toEqual([50, 50]);
  });
  it('partial returns add up to original credit', () => {
    const values = [0, 1, 2].map((index) => partialValue(100, 3, index, 1));
    expect(values).toEqual([33.33, 33.33, 33.34]);
  });
  it.each([
    [100, 150, 50, 0],
    [100, 100, 0, 0],
    [100, 80, 0, 20],
  ])(
    'settles credit %s against replacement %s',
    (credit, payable, additional, refund) => {
      const result = settlement(credit, payable);
      expect(result.additionalDue).toBe(additional);
      expect(result.refundDue).toBe(refund);
      expect(result.creditApplied + result.additionalDue).toBe(payable);
      expect(result.creditApplied + result.refundDue).toBe(credit);
    },
  );
  it('rejects negative allocation', () =>
    expect(() => allocateMoney(-1, [1])).toThrow());
});
