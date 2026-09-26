import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { CreateProductVariantRequestDto } from './product-variant-request.dto';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
// Chuỗi rỗng coi như không có giá trị, tránh "" lọt qua kiểm tra và đụng UNIQUE trên DB
const emptyToNull = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() || null : value;
const MONEY = { maxDecimalPlaces: 2 };
const MAX_MONEY = 9_999_999_999.99;

export class ProductImageRequestDto {
  @ApiProperty({ example: 'https://cdn.glowup.vn/products/velvet-tint-1.jpg' })
  @IsUrl({}, { message: 'Đường dẫn ảnh không hợp lệ' })
  imageUrl: string;

  @ApiPropertyOptional({ example: 'Son Black Rouge A01' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  altText?: string | null;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export class ProductIngredientRequestDto {
  @ApiProperty({ example: 'Niacinamide' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Tên thành phần không được để trống' })
  @MaxLength(150, { message: 'Tên thành phần tối đa 150 ký tự' })
  ingredientName: string;

  @ApiPropertyOptional({ example: '5%' })
  @IsOptional()
  @Transform(emptyToNull)
  @IsString()
  @MaxLength(20)
  percentage?: string | null;

  @ApiPropertyOptional({ example: true, default: false })
  @IsOptional()
  @IsBoolean()
  isKeyIngredient?: boolean;
}

export class CreateProductRequestDto {
  @ApiProperty({ description: 'ID danh mục', example: 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22' })
  @IsUUID('4', { message: 'ID danh mục không hợp lệ' })
  categoryId: string;

  @ApiPropertyOptional({ description: 'ID thương hiệu', example: 'b2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33' })
  @IsOptional()
  @IsUUID('4', { message: 'ID thương hiệu không hợp lệ' })
  brandId?: string | null;

  @ApiProperty({ example: 'Son kem lì Black Rouge Air Fit Velvet Tint' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Tên sản phẩm không được để trống' })
  @MaxLength(255, { message: 'Tên sản phẩm tối đa 255 ký tự' })
  name: string;

  @ApiProperty({ example: 'son-kem-li-black-rouge-air-fit-velvet-tint' })
  @Transform(trim)
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug chỉ gồm chữ thường không dấu, số và dấu gạch ngang',
  })
  @MaxLength(255)
  slug: string;

  @ApiProperty({ example: 'BR-VELVET-TINT' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'SKU sản phẩm không được để trống' })
  @MaxLength(50, { message: 'SKU sản phẩm tối đa 50 ký tự' })
  sku: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  shortDescription?: string | null;

  @ApiProperty({ example: 199000 })
  @IsNumber(MONEY, { message: 'Giá gốc phải là số, tối đa 2 chữ số thập phân' })
  @Min(0, { message: 'Giá gốc không được âm' })
  @Max(MAX_MONEY)
  basePrice: number;

  @ApiPropertyOptional({ example: 179000 })
  @IsOptional()
  @IsNumber(MONEY, { message: 'Giá khuyến mãi phải là số, tối đa 2 chữ số thập phân' })
  @Min(0, { message: 'Giá khuyến mãi không được âm' })
  @Max(MAX_MONEY)
  salePrice?: number | null;

  @ApiPropertyOptional({ example: 'Màu sắc' })
  @IsOptional()
  @Transform(emptyToNull)
  @IsString()
  @MaxLength(50)
  option1Name?: string | null;

  @ApiPropertyOptional({ example: 'Dung tích' })
  @IsOptional()
  @Transform(emptyToNull)
  @IsString()
  @MaxLength(50)
  option2Name?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(emptyToNull)
  @IsString()
  @MaxLength(50)
  option3Name?: string | null;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  metaTitle?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  metaDescription?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  metaKeywords?: string | null;

  @ApiProperty({ type: [CreateProductVariantRequestDto], description: 'Ít nhất 1 biến thể' })
  @IsArray()
  @ArrayMinSize(1, { message: 'Sản phẩm phải có ít nhất 1 biến thể' })
  @ValidateNested({ each: true })
  @Type(() => CreateProductVariantRequestDto)
  variants: CreateProductVariantRequestDto[];

  @ApiPropertyOptional({ type: [ProductImageRequestDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductImageRequestDto)
  images?: ProductImageRequestDto[];

  @ApiPropertyOptional({ example: ['bestseller', 'organic'], description: 'Gửi lên khi sửa = thay toàn bộ tag cũ' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @Transform(({ value }) => (Array.isArray(value) ? value.map((t) => (typeof t === 'string' ? t.trim() : t)) : value))
  @IsString({ each: true })
  @IsNotEmpty({ each: true, message: 'Tag không được để trống' })
  @MaxLength(50, { each: true, message: 'Mỗi tag tối đa 50 ký tự' })
  tags?: string[];

  @ApiPropertyOptional({ type: [ProductIngredientRequestDto], description: 'Gửi lên khi sửa = thay toàn bộ thành phần cũ' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductIngredientRequestDto)
  ingredients?: ProductIngredientRequestDto[];
}
