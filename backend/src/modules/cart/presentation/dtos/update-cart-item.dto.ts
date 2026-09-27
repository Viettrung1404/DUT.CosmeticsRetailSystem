import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpdateCartItemDto {
  @ApiProperty({ description: 'Số lượng mới cập nhật (1 - 99)', example: 2, minimum: 1, maximum: 99 })
  @IsInt({ message: 'Số lượng phải là số nguyên' })
  @Min(1, { message: 'Số lượng tối thiểu là 1' })
  @Max(99, { message: 'Số lượng tối đa cho mỗi sản phẩm là 99' })
  quantity: number;

  @ApiPropertyOptional({ description: 'Session ID dành cho khách vãng lai nếu chưa login' })
  @IsString()
  @IsOptional()
  sessionId?: string;
}

export class MergeCartDto {
  @ApiProperty({ description: 'Session ID của khách vãng lai cần gộp vào tài khoản hiện tại' })
  @IsString({ message: 'sessionId không được để trống' })
  sessionId: string;
}
