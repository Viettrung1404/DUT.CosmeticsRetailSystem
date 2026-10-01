import { allocateFefo, minExpiryForOnline } from '../fefo.util';

const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

describe('minExpiryForOnline', () => {
  it('cộng 3 tháng theo ngày Việt Nam', () => {
    // 20:00 UTC ngày 30/09 = 03:00 sáng 01/10 giờ Việt Nam
    expect(minExpiryForOnline(new Date('2026-09-30T20:00:00Z')).toISOString()).toBe(
      '2027-01-01T00:00:00.000Z',
    );
  });
});

describe('allocateFefo', () => {
  const minExpiry = d('2027-01-01');

  it('lấy lô hết hạn sớm nhất trước, sang lô sau khi lô trước hết', () => {
    const result = allocateFefo(
      [
        { id: 'late', quantity: 10, expiryDate: d('2027-12-01') },
        { id: 'early', quantity: 2, expiryDate: d('2027-03-01') },
      ],
      5,
      minExpiry,
    );
    expect(result).toEqual({
      allocations: [
        { batchId: 'early', quantity: 2 },
        { batchId: 'late', quantity: 3 },
      ],
      shortfall: 0,
    });
  });

  it('bỏ qua lô cận date (hạn dưới 3 tháng) và lô hết hạn (BR-04, BR-05)', () => {
    const result = allocateFefo(
      [
        { id: 'expired', quantity: 5, expiryDate: d('2026-09-01') },
        { id: 'near', quantity: 5, expiryDate: d('2026-12-31') },
        { id: 'ok', quantity: 5, expiryDate: d('2027-01-01') },
      ],
      3,
      minExpiry,
    );
    expect(result.allocations).toEqual([{ batchId: 'ok', quantity: 3 }]);
  });

  it('lô còn hạn không đủ → báo phần thiếu', () => {
    const result = allocateFefo(
      [
        { id: 'near', quantity: 10, expiryDate: d('2026-11-01') },
        { id: 'ok', quantity: 1, expiryDate: d('2027-06-01') },
      ],
      3,
      minExpiry,
    );
    expect(result.shortfall).toBe(2);
  });

  it('bỏ qua lô đã hết số lượng', () => {
    const result = allocateFefo(
      [
        { id: 'empty', quantity: 0, expiryDate: d('2027-02-01') },
        { id: 'ok', quantity: 4, expiryDate: d('2027-06-01') },
      ],
      4,
      minExpiry,
    );
    expect(result.allocations).toEqual([{ batchId: 'ok', quantity: 4 }]);
  });
});
