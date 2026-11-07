import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class ProductTagQueryDto {
  @ApiPropertyOptional({ description: 'Gõ một phần tên tag để gợi ý', example: 'best' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  readonly search?: string;

  @ApiPropertyOptional({ example: 50, description: 'Số tag tối đa trả về (1-200)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  readonly limit?: number;
}
