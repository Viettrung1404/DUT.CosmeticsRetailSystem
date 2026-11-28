import { BadRequestException } from '@nestjs/common';
import { calculatePointsRedemption, maxRedeemValue } from '../loyalty-policy.util';

describe('loyalty-policy', () => {
  it('maxRedeemValue lấy tối đa 100% giá trị tiền hàng', () => {
    expect(maxRedeemValue(300000)).toBe(300000);
    expect(maxRedeemValue(125000)).toBe(125000);
    expect(maxRedeemValue(0)).toBe(0);
  });

  it('dùng điểm: 1 điểm = 1đ và có thể dùng số lẻ từng xu', () => {
    expect(calculatePointsRedemption(30000, 60000, 300000)).toBe(30000);
    expect(calculatePointsRedemption(500, 1000, 300000)).toBe(500);
  });

  it('không dùng điểm thì giảm 0', () => {
    expect(calculatePointsRedemption(0, 10, 100000)).toBe(0);
  });

  it('số dư nhỏ vẫn được dùng (không chặn bởi ngưỡng tối thiểu)', () => {
    expect(calculatePointsRedemption(500, 500, 200000)).toBe(500);
  });

  it('vượt số dư thì chặn', () => {
    expect(() => calculatePointsRedemption(70000, 60000, 300000)).toThrow(
      'Số điểm thưởng sử dụng vượt quá số điểm hiện có của bạn',
    );
  });

  it('vượt giá trị đơn thì chặn', () => {
    expect(() => calculatePointsRedemption(350000, 400000, 300000)).toThrow(
      'Chỉ được dùng điểm tối đa giá trị đơn hàng',
    );
    expect(calculatePointsRedemption(300000, 300000, 300000)).toBe(300000);
  });
});
