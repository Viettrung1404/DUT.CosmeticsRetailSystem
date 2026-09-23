import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class CreateBrandRequestDto {
  @ApiProperty({ example: 'Innisfree' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Tên thương hiệu không được để trống' })
  @MaxLength(100, { message: 'Tên thương hiệu tối đa 100 ký tự' })
  name: string;

  @ApiProperty({ example: 'innisfree', description: 'Chữ thường không dấu, nối bằng dấu gạch ngang' })
  @Transform(trim)
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug chỉ gồm chữ thường không dấu, số và dấu gạch ngang (ví dụ: la-roche-posay)',
  })
  @MaxLength(150, { message: 'Slug tối đa 150 ký tự' })
  slug: string;

  @ApiPropertyOptional({ example: 'https://cdn.glowup.vn/brands/innisfree-logo.png' })
  @IsOptional()
  @IsUrl({}, { message: 'Đường dẫn logo không hợp lệ' })
  logoUrl?: string | null;

  @ApiPropertyOptional({ example: 'https://cdn.glowup.vn/brands/innisfree-banner.jpg' })
  @IsOptional()
  @IsUrl({}, { message: 'Đường dẫn banner không hợp lệ' })
  bannerUrl?: string | null;

  @ApiPropertyOptional({ example: 'Thương hiệu mỹ phẩm thiên nhiên đến từ đảo Jeju' })
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiPropertyOptional({ example: 'Hàn Quốc' })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Quốc gia xuất xứ tối đa 100 ký tự' })
  countryOfOrigin?: string | null;

  @ApiPropertyOptional({ example: 'https://www.innisfree.com' })
  @IsOptional()
  @IsUrl({}, { message: 'Website không hợp lệ' })
  @MaxLength(255, { message: 'Website tối đa 255 ký tự' })
  websiteUrl?: string | null;

  @ApiPropertyOptional({ example: 0, default: 0 })
  @IsOptional()
  @IsInt({ message: 'Thứ tự hiển thị phải là số nguyên' })
  @Min(0, { message: 'Thứ tự hiển thị không được âm' })
  sortOrder?: number;

  @ApiPropertyOptional({ example: false, default: false })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 'Innisfree chính hãng - GlowUp' })
  @IsOptional()
  @IsString()
  @MaxLength(255, { message: 'Tiêu đề SEO tối đa 255 ký tự' })
  metaTitle?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  metaDescription?: string | null;
}
