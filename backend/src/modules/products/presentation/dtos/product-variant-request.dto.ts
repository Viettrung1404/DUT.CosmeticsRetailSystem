import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
// Chuỗi rỗng coi như không có giá trị, tránh "" lọt qua kiểm tra và đụng UNIQUE trên DB
const emptyToNull = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() || null : value;
const MONEY = { maxDecimalPlaces: 2 };
const MAX_MONEY = 9_999_999_999.99;

export class CreateProductVariantRequestDto {
  @ApiProperty({ example: 'BR-VELVET-A01' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'SKU biến thể không được để trống' })
  @MaxLength(50, { message: 'SKU biến thể tối đa 50 ký tự' })
  sku: string;

  @ApiPropertyOptional({ example: '8809551234567' })
  @IsOptional()
  @Transform(emptyToNull)
  @IsString()
  @MaxLength(100, { message: 'Mã vạch tối đa 100 ký tự' })
  barcode?: string | null;

  @ApiPropertyOptional({ example: 'A01 Đỏ gạch' })
  @IsOptional()
  @Transform(emptyToNull)
  @IsString()
  @MaxLength(100)
  option1Value?: string | null;

  @ApiPropertyOptional({ example: '4g' })
  @IsOptional()
  @Transform(emptyToNull)
  @IsString()
  @MaxLength(100)
  option2Value?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(emptyToNull)
  @IsString()
  @MaxLength(100)
  option3Value?: string | null;

  @ApiProperty({ example: 179000 })
  @IsNumber(MONEY, { message: 'Giá bán phải là số, tối đa 2 chữ số thập phân' })
  @Min(0, { message: 'Giá bán không được âm' })
  @Max(MAX_MONEY)
  price: number;

  @ApiProperty({ example: 95000 })
  @IsNumber(MONEY, { message: 'Giá vốn phải là số, tối đa 2 chữ số thập phân' })
  @Min(0, { message: 'Giá vốn không được âm' })
  @Max(MAX_MONEY)
  costPrice: number;

  @ApiPropertyOptional({ example: 4, description: 'Khối lượng' })
  @IsOptional()
  @IsNumber(MONEY)
  @Min(0)
  @Max(999_999.99)
  weight?: number | null;

  @ApiPropertyOptional({ example: 'g' })
  @IsOptional()
  @Transform(emptyToNull)
  @IsString()
  @MaxLength(20)
  unit?: string | null;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateProductVariantRequestDto extends PartialType(CreateProductVariantRequestDto) {}
