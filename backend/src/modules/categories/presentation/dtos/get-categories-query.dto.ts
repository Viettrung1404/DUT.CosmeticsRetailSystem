import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { PageOptionsDto } from '@core/common/pagination.dto';

const toBoolean = ({ obj, key }: { obj: Record<string, unknown>; key: string }) => {
  if (obj[key] === 'true') return true;
  if (obj[key] === 'false') return false;
  return obj[key];
};

export class GetCategoriesQueryDto extends PageOptionsDto {
  @ApiPropertyOptional({ description: 'Tìm theo tên danh mục', example: 'kem' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  readonly search?: string;

  @ApiPropertyOptional({ description: 'Lọc theo trạng thái hoạt động' })
  @IsOptional()
  // Đọc giá trị gốc vì chuyển kiểu ngầm định sẽ biến chuỗi "false" thành true
  @Transform(toBoolean)
  @IsBoolean({ message: 'isActive chỉ nhận true hoặc false' })
  readonly isActive?: boolean;

  @ApiPropertyOptional({ description: 'Chỉ lấy các danh mục con trực tiếp của danh mục này' })
  @IsOptional()
  @IsUUID('4', { message: 'parentId không hợp lệ' })
  readonly parentId?: string;
}
