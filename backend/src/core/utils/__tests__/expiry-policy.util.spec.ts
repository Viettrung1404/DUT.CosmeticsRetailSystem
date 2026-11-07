import { nearExpiryThreshold, startOfVnToday } from '../expiry-policy.util';

describe('expiry-policy.util', () => {
  it('startOfVnToday lấy ngày theo giờ Việt Nam', () => {
    expect(startOfVnToday(new Date('2026-09-30T20:00:00Z')).toISOString()).toBe('2026-10-01T00:00:00.000Z');
  });

  it('nearExpiryThreshold = hôm nay (giờ VN) + 3 tháng', () => {
    expect(nearExpiryThreshold(new Date('2026-09-30T20:00:00Z')).toISOString()).toBe(
      '2027-01-01T00:00:00.000Z',
    );
  });
});
