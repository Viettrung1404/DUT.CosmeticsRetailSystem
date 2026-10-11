import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

const VN_PHONE_REGEX = /^(0|\+84)(3|5|7|8|9)[0-9]{8}$/;

export class UpdateCustomerProfileDto {
  @ApiPropertyOptional({ description: 'Họ và tên khách hàng', maxLength: 100 })
  @IsString({ message: 'Họ và tên phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Họ và tên không được để trống khi cập nhật' })
  @MaxLength(100, { message: 'Họ và tên tối đa 100 ký tự' })
  @IsOptional()
  fullName?: string;

  @ApiPropertyOptional({ description: 'Số điện thoại', example: '0901234567', maxLength: 20 })
  @IsString({ message: 'Số điện thoại phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Số điện thoại không được để trống khi cập nhật' })
  @MaxLength(20, { message: 'Số điện thoại tối đa 20 ký tự' })
  @Matches(VN_PHONE_REGEX, { message: 'Số điện thoại không đúng định dạng di động Việt Nam' })
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ description: 'Giới tính (MALE, FEMALE, OTHER)', enum: ['MALE', 'FEMALE', 'OTHER'] })
  @IsString({ message: 'Giới tính phải là chuỗi ký tự' })
  @IsIn(['MALE', 'FEMALE', 'OTHER'], { message: 'Giới tính phải là MALE, FEMALE hoặc OTHER' })
  @IsOptional()
  gender?: string;

  @ApiPropertyOptional({ description: 'Ngày sinh (YYYY-MM-DD)', example: '1995-10-25' })
  @IsDateString({}, { message: 'Ngày sinh không đúng định dạng ngày tháng ISO (YYYY-MM-DD)' })
  @IsOptional()
  dateOfBirth?: string;
}
