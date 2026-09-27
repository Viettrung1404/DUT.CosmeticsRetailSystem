import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCustomerAddressDto {
  @ApiPropertyOptional({ description: 'Nhãn gợi nhớ (VD: Nhà riêng, Công ty)' })
  @IsString()
  @IsOptional()
  label?: string;

  @ApiProperty({ description: 'Họ và tên người nhận hàng' })
  @IsString({ message: 'Tên người nhận phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Tên người nhận không được để trống' })
  recipientName: string;

  @ApiProperty({ description: 'Số điện thoại người nhận hàng' })
  @IsString({ message: 'Số điện thoại phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Số điện thoại không được để trống' })
  phone: string;

  @ApiProperty({ description: 'Địa chỉ cụ thể (Số nhà, tên đường)' })
  @IsString()
  @IsNotEmpty({ message: 'Địa chỉ chi tiết không được để trống' })
  addressLine: string;

  @ApiProperty({ description: 'Tỉnh / Thành phố' })
  @IsString()
  @IsNotEmpty({ message: 'Tỉnh/Thành phố không được để trống' })
  city: string;

  @ApiProperty({ description: 'Quận / Huyện' })
  @IsString()
  @IsNotEmpty({ message: 'Quận/Huyện không được để trống' })
  district: string;

  @ApiProperty({ description: 'Phường / Xã' })
  @IsString()
  @IsNotEmpty({ message: 'Phường/Xã không được để trống' })
  ward: string;

  @ApiPropertyOptional({ description: 'Đặt làm địa chỉ nhận hàng mặc định', default: false })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}

export class UpdateCustomerAddressDto {
  @ApiPropertyOptional({ description: 'Nhãn gợi nhớ' })
  @IsString()
  @IsOptional()
  label?: string;

  @ApiPropertyOptional({ description: 'Họ và tên người nhận hàng' })
  @IsString()
  @IsOptional()
  recipientName?: string;

  @ApiPropertyOptional({ description: 'Số điện thoại người nhận hàng' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ description: 'Địa chỉ cụ thể' })
  @IsString()
  @IsOptional()
  addressLine?: string;

  @ApiPropertyOptional({ description: 'Tỉnh / Thành phố' })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({ description: 'Quận / Huyện' })
  @IsString()
  @IsOptional()
  district?: string;

  @ApiPropertyOptional({ description: 'Phường / Xã' })
  @IsString()
  @IsOptional()
  ward?: string;

  @ApiPropertyOptional({ description: 'Đặt làm địa chỉ nhận hàng mặc định' })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}
