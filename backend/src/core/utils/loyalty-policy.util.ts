import { BadRequestException } from '@nestjs/common';

// BR-02: 1 điểm = 1đ khi dùng (tương đương tiền thật)
export const POINT_VALUE_VND = 1;
// Số dư quy đổi tối thiểu để được dùng điểm (0đ = có điểm là được dùng)
export const MIN_REDEEM_BALANCE_VND = 0;
// Chỉ dùng theo bội số của mức này (1đ = dùng lẻ từng xu)
export const REDEEM_STEP_VND = 1;
// BR-03: dùng điểm tối đa 100% giá trị đơn (toàn bộ tiền hàng)
export const MAX_REDEEM_RATIO = 1.0;

const formatVnd = (n: number) => n.toLocaleString('vi-VN');

export const maxRedeemValue = (payableBase: number): number => {
  const max = Math.floor(Math.max(payableBase, 0) * MAX_REDEEM_RATIO);
  return Math.floor(max / REDEEM_STEP_VND) * REDEEM_STEP_VND;
};

// payableBase: giá trị đơn sau khuyến mãi + voucher (chưa tính phí ship)
export const calculatePointsRedemption = (
  pointsToUse: number,
  availablePoints: number,
  payableBase: number,
): number => {
  if (!Number.isInteger(pointsToUse) || pointsToUse <= 0) return 0;

  if (pointsToUse > availablePoints) {
    throw new BadRequestException('Số điểm thưởng sử dụng vượt quá số điểm hiện có của bạn');
  }

  if (MIN_REDEEM_BALANCE_VND > 0 && availablePoints * POINT_VALUE_VND < MIN_REDEEM_BALANCE_VND) {
    throw new BadRequestException(
      `Cần có tối thiểu ${formatVnd(MIN_REDEEM_BALANCE_VND / POINT_VALUE_VND)} điểm mới được dùng điểm để thanh toán`,
    );
  }

  const value = pointsToUse * POINT_VALUE_VND;
  if (value % REDEEM_STEP_VND !== 0) {
    throw new BadRequestException(
      `Điểm sử dụng phải theo bội số của ${formatVnd(REDEEM_STEP_VND / POINT_VALUE_VND)} điểm`,
    );
  }

  const max = maxRedeemValue(payableBase);
  if (value > max) {
    throw new BadRequestException(
      `Chỉ được dùng điểm tối đa giá trị đơn hàng (tối đa ${formatVnd(max / POINT_VALUE_VND)} điểm cho đơn này)`,
    );
  }

  return value;
};
