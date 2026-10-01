import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

const VN_PHONE_REGEX = /^(0|\+84)(3|5|7|8|9)[0-9]{8}$/;

export class CreateCustomerAddressDto {
  @ApiPropertyOptional({ description: 'Nhãn gợi nhớ (VD: Nhà riêng, Công ty)', maxLength: 50 })
  @IsString({ message: 'Nhãn địa chỉ phải là chuỗi ký tự' })
  @MaxLength(50, { message: 'Nhãn địa chỉ tối đa 50 ký tự' })
  @IsOptional()
  label?: string;

  @ApiProperty({ description: 'Họ và tên người nhận hàng', maxLength: 100 })
  @IsString({ message: 'Tên người nhận phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Tên người nhận không được để trống' })
  @MaxLength(100, { message: 'Tên người nhận tối đa 100 ký tự' })
  recipientName: string;

  @ApiProperty({ description: 'Số điện thoại người nhận hàng', example: '0901234567', maxLength: 20 })
  @IsString({ message: 'Số điện thoại phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Số điện thoại không được để trống' })
  @MaxLength(20, { message: 'Số điện thoại tối đa 20 ký tự' })
  @Matches(VN_PHONE_REGEX, { message: 'Số điện thoại không đúng định dạng di động Việt Nam' })
  phone: string;

  @ApiProperty({ description: 'Địa chỉ cụ thể (Số nhà, tên đường)', maxLength: 255 })
  @IsString({ message: 'Địa chỉ chi tiết phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Địa chỉ chi tiết không được để trống' })
  @MaxLength(255, { message: 'Địa chỉ chi tiết tối đa 255 ký tự' })
  addressLine: string;

  @ApiProperty({ description: 'Tỉnh / Thành phố', maxLength: 100 })
  @IsString({ message: 'Tỉnh/Thành phố phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Tỉnh/Thành phố không được để trống' })
  @MaxLength(100, { message: 'Tỉnh/Thành phố tối đa 100 ký tự' })
  city: string;

  @ApiProperty({ description: 'Quận / Huyện', maxLength: 100 })
  @IsString({ message: 'Quận/Huyện phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Quận/Huyện không được để trống' })
  @MaxLength(100, { message: 'Quận/Huyện tối đa 100 ký tự' })
  district: string;

  @ApiProperty({ description: 'Phường / Xã', maxLength: 100 })
  @IsString({ message: 'Phường/Xã phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Phường/Xã không được để trống' })
  @MaxLength(100, { message: 'Phường/Xã tối đa 100 ký tự' })
  ward: string;

  @ApiPropertyOptional({ description: 'Đặt làm địa chỉ nhận hàng mặc định', default: false })
  @IsBoolean({ message: 'isDefault phải là giá trị boolean' })
  @IsOptional()
  isDefault?: boolean;
}

export class UpdateCustomerAddressDto {
  @ApiPropertyOptional({ description: 'Nhãn gợi nhớ', maxLength: 50 })
  @IsString({ message: 'Nhãn địa chỉ phải là chuỗi ký tự' })
  @MaxLength(50, { message: 'Nhãn địa chỉ tối đa 50 ký tự' })
  @IsOptional()
  label?: string;

  @ApiPropertyOptional({ description: 'Họ và tên người nhận hàng', maxLength: 100 })
  @IsString({ message: 'Tên người nhận phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Tên người nhận không được để trống khi cập nhật' })
  @MaxLength(100, { message: 'Tên người nhận tối đa 100 ký tự' })
  @IsOptional()
  recipientName?: string;

  @ApiPropertyOptional({ description: 'Số điện thoại người nhận hàng', maxLength: 20 })
  @IsString({ message: 'Số điện thoại phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Số điện thoại không được để trống khi cập nhật' })
  @MaxLength(20, { message: 'Số điện thoại tối đa 20 ký tự' })
  @Matches(VN_PHONE_REGEX, { message: 'Số điện thoại không đúng định dạng di động Việt Nam' })
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ description: 'Địa chỉ cụ thể', maxLength: 255 })
  @IsString({ message: 'Địa chỉ chi tiết phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Địa chỉ chi tiết không được để trống khi cập nhật' })
  @MaxLength(255, { message: 'Địa chỉ chi tiết tối đa 255 ký tự' })
  @IsOptional()
  addressLine?: string;

  @ApiPropertyOptional({ description: 'Tỉnh / Thành phố', maxLength: 100 })
  @IsString({ message: 'Tỉnh/Thành phố phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Tỉnh/Thành phố không được để trống khi cập nhật' })
  @MaxLength(100, { message: 'Tỉnh/Thành phố tối đa 100 ký tự' })
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({ description: 'Quận / Huyện', maxLength: 100 })
  @IsString({ message: 'Quận/Huyện phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Quận/Huyện không được để trống khi cập nhật' })
  @MaxLength(100, { message: 'Quận/Huyện tối đa 100 ký tự' })
  @IsOptional()
  district?: string;

  @ApiPropertyOptional({ description: 'Phường / Xã', maxLength: 100 })
  @IsString({ message: 'Phường/Xã phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Phường/Xã không được để trống khi cập nhật' })
  @MaxLength(100, { message: 'Phường/Xã tối đa 100 ký tự' })
  @IsOptional()
  ward?: string;

  @ApiPropertyOptional({ description: 'Đặt làm địa chỉ nhận hàng mặc định' })
  @IsBoolean({ message: 'isDefault phải là giá trị boolean' })
  @IsOptional()
  isDefault?: boolean;
}
