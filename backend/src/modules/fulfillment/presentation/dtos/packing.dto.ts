import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreatePackageItemDto {
  @ApiProperty({ description: 'ID của ProductVariant', example: 'uuid' })
  @IsUUID()
  @IsNotEmpty()
  productVariantId: string;

  @ApiProperty({ description: 'Số lượng sản phẩm trong kiện này', example: 2 })
  @IsInt()
  @IsPositive()
  quantity: number;
}

export class CreatePackageDto {
  @ApiPropertyOptional({
    description: 'Mã kiện hàng (nếu để trống hệ thống sẽ tự sinh PKG-YYYYMMDD-XXXX)',
    example: 'PKG-20261116-0001',
  })
  @IsString()
  @IsOptional()
  packageCode?: string;

  @ApiProperty({
    description: 'Trọng lượng thực tế sau đóng gói (grams)',
    example: 650,
  })
  @IsInt()
  @Min(1)
  actualWeightGrams: number;

  @ApiProperty({ description: 'Chiều dài kiện (cm)', example: 20 })
  @IsInt()
  @Min(1)
  lengthCm: number;

  @ApiProperty({ description: 'Chiều rộng kiện (cm)', example: 15 })
  @IsInt()
  @Min(1)
  widthCm: number;

  @ApiProperty({ description: 'Chiều cao kiện (cm)', example: 10 })
  @IsInt()
  @Min(1)
  heightCm: number;

  @ApiProperty({
    description: 'Danh sách sản phẩm và số lượng đóng vào kiện này',
    type: [CreatePackageItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePackageItemDto)
  items: CreatePackageItemDto[];
}

export class CompletePackingDto {
  @ApiProperty({
    description: 'Danh sách các kiện hàng đóng gói (1 hoặc nhiều kiện)',
    type: [CreatePackageDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePackageDto)
  packages: CreatePackageDto[];
}

export class PackageItemResponseDto {
  productVariantId: string;
  quantity: number;
}

export class PackageResponseDto {
  id: string;
  packageCode: string;
  actualWeightGrams: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  sealedAt: Date | null;
  items: PackageItemResponseDto[];
}

export class CompletePackingResponseDto {
  success: boolean;
  status: string;
  packedAt: Date;
  fulfillmentOrderId: string;
  shipmentId: string;
  shipmentCode: string;
  carrierCode: string;
  totalPackagesCount: number;
  packages: PackageResponseDto[];
}
