import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';

export class SuggestProductsQueryDto {
  @ApiProperty({
    example: 'son',
    description: 'Từ khóa bắt đầu gõ để tìm kiếm gợi ý',
  })
  @IsString()
  @IsNotEmpty({ message: 'Từ khóa tìm kiếm không được để trống' })
  q: string;

  @ApiPropertyOptional({
    example: 8,
    default: 8,
    minimum: 1,
    maximum: 20,
    description: 'Số lượng kết quả gợi ý trả về',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  @IsOptional()
  limit?: number = 8;
}
