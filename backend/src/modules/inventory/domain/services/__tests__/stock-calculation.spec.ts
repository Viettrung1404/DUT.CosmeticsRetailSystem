import { allocateByExpiry, weightedAverageCost } from '../stock-calculation';

const d = (s: string) => new Date(`${s}T00:00:00Z`);

describe('allocateByExpiry (FEFO)', () => {
  it('lấy lô hết hạn sớm trước, tràn sang lô sau', () => {
    const result = allocateByExpiry(
      [
        { id: 'late', quantity: 10, expiryDate: d('2028-01-01') },
        { id: 'early', quantity: 3, expiryDate: d('2026-12-01') },
      ],
      5,
    );
    expect(result).toEqual({
      allocations: [
        { batchId: 'early', quantity: 3 },
        { batchId: 'late', quantity: 2 },
      ],
      shortfall: 0,
    });
  });

  it('bỏ qua lô đã hết số lượng và báo phần thiếu', () => {
    const result = allocateByExpiry(
      [
        { id: 'empty', quantity: 0, expiryDate: d('2026-01-01') },
        { id: 'a', quantity: 2, expiryDate: d('2027-01-01') },
      ],
      5,
    );
    expect(result.allocations).toEqual([{ batchId: 'a', quantity: 2 }]);
    expect(result.shortfall).toBe(3);
  });
});

describe('weightedAverageCost', () => {
  it('tính bình quân gia quyền', () => {
    // (10 × 100.000 + 30 × 120.000) / 40 = 115.000
    expect(weightedAverageCost(10, 100_000, 30, 120_000)).toBe(115_000);
  });

  it('chưa có tồn thì lấy giá nhập', () => {
    expect(weightedAverageCost(0, 90_000, 5, 120_000)).toBe(120_000);
  });

  it('tồn âm (dữ liệu lệch) được coi như 0', () => {
    expect(weightedAverageCost(-3, 90_000, 5, 120_000)).toBe(120_000);
  });

  it('làm tròn 2 chữ số thập phân', () => {
    expect(weightedAverageCost(1, 10, 2, 11)).toBe(10.67);
  });
});
