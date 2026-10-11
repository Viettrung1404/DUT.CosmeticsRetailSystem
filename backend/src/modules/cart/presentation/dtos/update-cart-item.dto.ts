import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpdateCartItemDto {
  @ApiPropertyOptional({ description: 'Số lượng mới cập nhật (1 - 99)', example: 2, minimum: 1, maximum: 99 })
  @IsInt({ message: 'Số lượng phải là số nguyên' })
  @Min(1, { message: 'Số lượng tối thiểu là 1' })
  @Max(99, { message: 'Số lượng tối đa cho mỗi sản phẩm là 99' })
  @IsOptional()
  quantity?: number;

  @ApiPropertyOptional({ description: 'Trạng thái chọn để thanh toán (Partial Checkout)', example: true })
  @IsBoolean({ message: 'isSelected phải là giá trị boolean' })
  @IsOptional()
  isSelected?: boolean;

  @ApiPropertyOptional({ description: 'Session ID dành cho khách vãng lai nếu chưa login' })
  @IsString()
  @IsOptional()
  sessionId?: string;
}
