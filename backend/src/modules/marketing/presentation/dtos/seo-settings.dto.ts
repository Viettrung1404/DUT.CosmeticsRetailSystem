import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUrl, MaxLength, ValidateIf } from 'class-validator';

export class SeoSettingsDto {
  @ApiPropertyOptional({ example: 'GlowUp Cosmetics' })
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Tên website không được để trống' })
  @MaxLength(100, { message: 'Tên website tối đa 100 ký tự' })
  readonly siteName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Mô tả website không được để trống' })
  @MaxLength(300, { message: 'Mô tả website tối đa 300 ký tự' })
  readonly siteDescription?: string;

  @ApiPropertyOptional({ nullable: true, description: 'Ảnh mặc định khi chia sẻ link (Open Graph)' })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsUrl({ protocols: ['https', 'http'], require_protocol: true }, { message: 'Ảnh chia sẻ phải là đường dẫn hợp lệ' })
  readonly defaultOgImage?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @MaxLength(255, { message: 'Từ khóa tối đa 255 ký tự' })
  readonly defaultKeywords?: string | null;
}
