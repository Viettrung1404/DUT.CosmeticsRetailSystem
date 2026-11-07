import {
  calculateCommission,
  calculateEarnedPoints,
  readPointRate,
  resolveTier,
} from '../loyalty.util';
import { getAdminOrderActions } from '../order-actions.util';

const TIERS = [
  { id: 't1', name: 'Bronze', minPoints: 0 },
  { id: 't2', name: 'Silver', minPoints: 1000 },
  { id: 't3', name: 'Gold', minPoints: 5000 },
  { id: 't4', name: 'Diamond', minPoints: 15000 },
];

describe('loyalty.util', () => {
  it('tính điểm = tổng tiền × tỷ lệ × hệ số hạng, làm tròn xuống', () => {
    expect(calculateEarnedPoints(990000, 0.0001, 1)).toBe(99);
    expect(calculateEarnedPoints(990000, 0.0001, 1.5)).toBe(148);
  });

  it('chọn hạng cao nhất mà điểm đạt tới', () => {
    expect(resolveTier(TIERS, 0)?.name).toBe('Bronze');
    expect(resolveTier(TIERS, 999)?.name).toBe('Bronze');
    expect(resolveTier(TIERS, 1000)?.name).toBe('Silver');
    expect(resolveTier(TIERS, 20000)?.name).toBe('Diamond');
    expect(resolveTier([], 500)).toBeNull();
  });

  it('hoa hồng = tổng tiền × % / 100, làm tròn tới đồng', () => {
    expect(calculateCommission(990000, 2)).toBe(19800);
    expect(calculateCommission(333333, 1.5)).toBe(5000);
  });

  it('đọc point_rate trong settings, sai kiểu hoặc không có thì trả null', () => {
    expect(readPointRate({ point_rate: 0.0001 })).toBe(0.0001);
    expect(readPointRate({ point_rate: '0.0001' })).toBeNull();
    expect(readPointRate({ point_rate: 0 })).toBeNull();
    expect(readPointRate(null)).toBeNull();
    expect(readPointRate(undefined)).toBeNull();
  });
});

describe('getAdminOrderActions.nextStatuses', () => {
  it.each([
    ['PENDING', []],
    ['CONFIRMED', ['PROCESSING']],
    ['PROCESSING', ['SHIPPING']],
    ['SHIPPING', ['DELIVERED']],
    ['DELIVERED', ['COMPLETED']],
    ['COMPLETED', []],
    ['CANCELLED', []],
  ])('đơn %s → %j', (status, expected) => {
    expect(getAdminOrderActions(status).nextStatuses).toEqual(expected);
  });
});
