import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  Matches,
  ArrayMaxSize,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { OrderItemDto } from './preview-order.dto';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ShippingAddressDto {
  @IsNotEmpty({ message: 'Tên người nhận không được để trống' })
  @IsString()
  @ApiProperty()
  recipientName: string;

  @IsNotEmpty({ message: 'Số điện thoại người nhận không được để trống' })
  @IsString()
  @ApiProperty()
  phone: string;

  @IsNotEmpty({ message: 'Địa chỉ nhận hàng không được để trống' })
  @IsString()
  @ApiProperty()
  addressLine: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  ward?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  district?: string;

  @IsNotEmpty({ message: 'Tỉnh/Thành phố không được để trống' })
  @IsString()
  @ApiProperty()
  city: string;
}

export class CreateOrderDto {
  @ApiProperty({
    description: 'SHA256 quoteVersion từ POST /orders/preview; cần xác nhận lại nếu giá đổi',
  })
  @IsOptional()
  @Matches(/^[a-f0-9]{64}$/)
  quoteVersion?: string;
  @IsNotEmpty({ message: 'Địa chỉ giao hàng không được để trống' })
  @ValidateNested()
  @Type(() => ShippingAddressDto)
  @ApiProperty({ type: ShippingAddressDto })
  shippingAddress: ShippingAddressDto;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    default: 'COD',
    description: 'Only COD is enabled; online payments require the payment module',
  })
  paymentMethod?: string; // Default: 'COD'

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

  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  note?: string;
}
