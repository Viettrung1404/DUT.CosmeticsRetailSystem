import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateProductRequestDto {
  @ApiProperty({ description: 'ID danh mục', example: 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22' })
  @IsUUID()
  @IsNotEmpty({ message: 'Danh mục không được để trống' })
  categoryId: string;

  @ApiPropertyOptional({ description: 'ID thương hiệu', example: 'b2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33' })
  @IsUUID()
  @IsOptional()
  brandId?: string;

  @ApiProperty({ description: 'Tên sản phẩm', example: 'Son kem lì Black Rouge Air Fit Velvet Tint' })
  @IsString()
  @IsNotEmpty({ message: 'Tên sản phẩm không được để trống' })
  name: string;

  @ApiProperty({ description: 'Slug định danh đường dẫn', example: 'son-kem-li-black-rouge-air-fit-velvet-tint' })
  @IsString()
  @IsNotEmpty({ message: 'Slug không được để trống' })
  slug: string;

  @ApiProperty({ description: 'Mã Model SKU', example: 'BR-VELVET-TINT' })
  @IsString()
  @IsNotEmpty({ message: 'SKU không được để trống' })
  sku: string;

  @ApiProperty({ description: 'Giá niêm yết tham chiếu', example: 199000 })
  basePrice: number;

  @ApiPropertyOptional({ description: 'Mô tả sản phẩm' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Tên thuộc tính 1 (e.g. Màu sắc)' })
  @IsString()
  @IsOptional()
  option1Name?: string;

  @ApiPropertyOptional({ description: 'Tên thuộc tính 2 (e.g. Dung tích)' })
  @IsString()
  @IsOptional()
  option2Name?: string;

  @ApiPropertyOptional({ description: 'Tên thuộc tính 3' })
  @IsString()
  @IsOptional()
  option3Name?: string;
}
