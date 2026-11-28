import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  Max,
  ArrayMaxSize,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class OrderItemDto {
  @IsNotEmpty({ message: 'productVariantId không được để trống' })
  @IsUUID('all', { message: 'productVariantId phải là UUID' })
  @ApiProperty({ format: 'uuid' })
  variantId: string;

  @IsInt({ message: 'Số lượng phải là số nguyên' })
  @Min(1, { message: 'Số lượng phải lớn hơn hoặc bằng 1' })
  @Max(10000)
  @ApiProperty({ minimum: 1, maximum: 10000, type: 'integer' })
  quantity: number;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  @ApiPropertyOptional({
    maxLength: 60,
    description: 'Nguồn gợi ý attribution (vd: rec_home, rec_similar, rec_bought_together, rec_cart)',
  })
  attributionSource?: string;
}

export class PreviewOrderDto {
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  @ApiPropertyOptional({
    type: [OrderItemDto],
    maxItems: 100,
    description: 'If omitted, uses selected cart items',
  })
  items?: OrderItemDto[];

  @IsOptional()
  @IsString()
  @MaxLength(50)
  @ApiPropertyOptional({ maxLength: 50 })
  couponCode?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @ApiPropertyOptional({ minimum: 0, type: 'integer' })
  usePoints?: number;

  @IsOptional()
  @IsUUID('all')
  @ApiPropertyOptional({ format: 'uuid' })
  storeId?: string;
}
