import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class CreateCategoryRequestDto {
  @ApiPropertyOptional({ description: 'ID danh mục cha; bỏ trống hoặc null nếu là danh mục gốc' })
  @IsOptional()
  @IsUUID('4', { message: 'ID danh mục cha không hợp lệ' })
  parentId?: string | null;

  @ApiProperty({ example: 'Kem chống nắng' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Tên danh mục không được để trống' })
  @MaxLength(150, { message: 'Tên danh mục tối đa 150 ký tự' })
  name: string;

  @ApiProperty({ example: 'kem-chong-nang', description: 'Chữ thường không dấu, nối bằng dấu gạch ngang' })
  @Transform(trim)
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug chỉ gồm chữ thường không dấu, số và dấu gạch ngang (ví dụ: kem-chong-nang)',
  })
  @MaxLength(150, { message: 'Slug tối đa 150 ký tự' })
  slug: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiPropertyOptional({ example: 'https://cdn.glowup.vn/categories/kem-chong-nang.jpg' })
  @IsOptional()
  @IsUrl({}, { message: 'Đường dẫn ảnh không hợp lệ' })
  imageUrl?: string | null;

  @ApiPropertyOptional({ example: 0, default: 0 })
  @IsOptional()
  @IsInt({ message: 'Thứ tự hiển thị phải là số nguyên' })
  @Min(0, { message: 'Thứ tự hiển thị không được âm' })
  sortOrder?: number;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255, { message: 'Tiêu đề SEO tối đa 255 ký tự' })
  metaTitle?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  metaDescription?: string | null;
}
