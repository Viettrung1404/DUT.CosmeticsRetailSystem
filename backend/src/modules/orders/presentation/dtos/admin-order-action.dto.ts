import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { OrderStatus } from '@core/domain/orders/order-status.enum';
import { ADMIN_STATUS_TARGETS } from '../../application/utils/order-actions.util';

export class ConfirmOrderDto {
  @ApiPropertyOptional({ description: 'Ghi chú lưu vào lịch sử trạng thái', example: 'Đã gọi xác nhận với khách' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  readonly note?: string;
}

export class UpdateOrderStatusDto {
  @ApiProperty({ enum: ADMIN_STATUS_TARGETS, example: OrderStatus.PROCESSING })
  @IsIn(ADMIN_STATUS_TARGETS, {
    message: 'Chỉ đổi được sang PROCESSING, SHIPPING, DELIVERED hoặc COMPLETED; xác nhận và hủy đơn dùng API riêng',
  })
  readonly status: OrderStatus;

  @ApiPropertyOptional({ description: 'Ghi chú lưu vào lịch sử trạng thái', example: 'Đã bàn giao cho GHN' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  readonly note?: string;
}
