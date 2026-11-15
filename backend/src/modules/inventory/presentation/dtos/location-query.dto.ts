import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class LocationQueryDto {
  @ApiPropertyOptional({
    description: 'Lọc theo loại địa điểm: STORE (Showroom) hoặc WAREHOUSE (Kho tổng)',
    example: 'STORE',
  })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({
    description: 'Lọc theo thành phố / tỉnh thành',
    example: 'TP. Hồ Chí Minh',
  })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({
    description: 'Trạng thái hoạt động (mặc định: true)',
    default: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsBoolean()
  isActive?: boolean = true;
}
