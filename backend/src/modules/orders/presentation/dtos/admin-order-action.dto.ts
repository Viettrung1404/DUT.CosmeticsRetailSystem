import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ConfirmOrderDto {
  @ApiPropertyOptional({ description: 'Ghi chú lưu vào lịch sử trạng thái', example: 'Đã gọi xác nhận với khách' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  readonly note?: string;
}
