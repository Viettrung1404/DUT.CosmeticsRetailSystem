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
import { ApiProperty } from '@nestjs/swagger';

export class ShippingAddressDto {
  @IsNotEmpty({ message: 'Tên người nhận không được để trống' })
  @IsString()
  recipientName: string;

  @IsNotEmpty({ message: 'Số điện thoại người nhận không được để trống' })
  @IsString()
  phone: string;

  @IsNotEmpty({ message: 'Địa chỉ nhận hàng không được để trống' })
  @IsString()
  addressLine: string;

  @IsOptional()
  @IsString()
  ward?: string;

  @IsOptional()
  @IsString()
  district?: string;

  @IsNotEmpty({ message: 'Tỉnh/Thành phố không được để trống' })
  @IsString()
  city: string;
}

export class CreateOrderDto {
  @ApiProperty({ description: 'SHA256 quoteVersion từ POST /orders/preview; cần xác nhận lại nếu giá đổi' })
  @IsOptional()
  @Matches(/^[a-f0-9]{64}$/)
  quoteVersion?: string;
  @IsNotEmpty({ message: 'Địa chỉ giao hàng không được để trống' })
  @ValidateNested()
  @Type(() => ShippingAddressDto)
  shippingAddress: ShippingAddressDto;

  @IsOptional()
  @IsString()
  paymentMethod?: string; // Default: 'COD'

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items?: OrderItemDto[];

  @IsOptional()
  @IsString()
  @MaxLength(50)
  couponCode?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  usePoints?: number;

  @IsOptional()
  @IsUUID('all')
  storeId?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
