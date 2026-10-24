import { BadRequestException } from '@nestjs/common';
import { calculatePointsRedemption, maxRedeemValue } from '../loyalty-policy.util';

describe('loyalty-policy', () => {
  it('maxRedeemValue lấy 50% rồi làm tròn xuống bội 10.000', () => {
    expect(maxRedeemValue(300000)).toBe(150000);
    expect(maxRedeemValue(125000)).toBe(60000);
    expect(maxRedeemValue(0)).toBe(0);
  });

  it('dùng đúng bội số, số dư đủ ngưỡng: 1 điểm = 1đ', () => {
    expect(calculatePointsRedemption(30000, 60000, 300000)).toBe(30000);
  });

  it('không dùng điểm thì giảm 0', () => {
    expect(calculatePointsRedemption(0, 10, 100000)).toBe(0);
  });

  it('số dư dưới 50.000 thì chặn', () => {
    expect(() => calculatePointsRedemption(10000, 49999, 300000)).toThrow(
      new BadRequestException('Cần có tối thiểu 50.000 điểm mới được dùng điểm để thanh toán'),
    );
  });

  it('số dư đúng 50.000 thì được dùng', () => {
    expect(calculatePointsRedemption(50000, 50000, 200000)).toBe(50000);
  });

  it('vượt số dư thì chặn', () => {
    expect(() => calculatePointsRedemption(70000, 60000, 300000)).toThrow(
      'Số điểm thưởng sử dụng vượt quá số điểm hiện có của bạn',
    );
  });

  it('không theo bội số 10.000 thì chặn', () => {
    expect(() => calculatePointsRedemption(15000, 60000, 300000)).toThrow(
      'Điểm sử dụng phải theo bội số của 10.000 điểm',
    );
  });

  it('vượt 50% giá trị đơn thì chặn', () => {
    expect(() => calculatePointsRedemption(160000, 200000, 300000)).toThrow(
      'Chỉ được dùng điểm tối đa 50% giá trị đơn hàng',
    );
    expect(calculatePointsRedemption(150000, 200000, 300000)).toBe(150000);
  });
});
