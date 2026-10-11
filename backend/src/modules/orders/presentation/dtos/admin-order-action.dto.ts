import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { OrderStatus } from '@core/domain/orders/order-status.enum';
import { ADMIN_STATUS_TARGETS } from '../../application/utils/order-actions.util';

const NOTE_MAX = { message: 'Ghi chú tối đa 500 ký tự' };
const NOTE_TEXT = { message: 'Ghi chú phải là chuỗi ký tự' };

export class ConfirmOrderDto {
  @ApiPropertyOptional({ description: 'Ghi chú lưu vào lịch sử trạng thái', example: 'Đã gọi xác nhận với khách' })
  @IsOptional()
  @IsString(NOTE_TEXT)
  @MaxLength(500, NOTE_MAX)
  readonly note?: string;
}

export class CancelOrderByAdminDto {
  @ApiProperty({ description: 'Lý do hủy, lưu vào lịch sử trạng thái và phiếu hoàn tiền', example: 'Khách đổi ý, gọi điện xin hủy' })
  @IsString({ message: 'Lý do hủy phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Phải nhập lý do hủy đơn' })
  @MaxLength(500, { message: 'Lý do hủy tối đa 500 ký tự' })
  readonly reason: string;
}

export class UpdateOrderStatusDto {
  @ApiProperty({ enum: ADMIN_STATUS_TARGETS, example: OrderStatus.PROCESSING })
  @IsIn(ADMIN_STATUS_TARGETS, {
    message: 'Chỉ đổi được sang PROCESSING, SHIPPING, DELIVERED hoặc COMPLETED; xác nhận và hủy đơn dùng API riêng',
  })
  readonly status: OrderStatus;

  @ApiPropertyOptional({ description: 'Ghi chú lưu vào lịch sử trạng thái', example: 'Đã bàn giao cho GHN' })
  @IsOptional()
  @IsString(NOTE_TEXT)
  @MaxLength(500, NOTE_MAX)
  readonly note?: string;
}
