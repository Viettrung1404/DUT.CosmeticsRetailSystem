import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { PageOptionsDto } from '@core/common/pagination.dto';

const toBoolean = ({ obj, key }: { obj: Record<string, unknown>; key: string }) => {
  if (obj[key] === 'true') return true;
  if (obj[key] === 'false') return false;
  return obj[key];
};

export class GetAdminProductsQueryDto extends PageOptionsDto {
  @ApiPropertyOptional({ description: 'Tìm theo tên hoặc SKU', example: 'velvet' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  readonly search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4', { message: 'categoryId không hợp lệ' })
  readonly categoryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4', { message: 'brandId không hợp lệ' })
  readonly brandId?: string;

  @ApiPropertyOptional({ description: 'Lọc theo trạng thái kinh doanh' })
  @IsOptional()
  // Đọc giá trị gốc vì chuyển kiểu ngầm định sẽ biến chuỗi "false" thành true
  @Transform(toBoolean)
  @IsBoolean({ message: 'isActive chỉ nhận true hoặc false' })
  readonly isActive?: boolean;
}
