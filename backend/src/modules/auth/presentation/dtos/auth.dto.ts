import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  Matches,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'customer@example.com', description: 'Địa chỉ email người dùng' })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email: string;

  @ApiProperty({
    example: 'GlowUp@2026',
    description: 'Mật khẩu tối thiểu 8 ký tự, gồm chữ hoa, chữ thường và chữ số',
  })
  @IsString()
  @MinLength(8, { message: 'Mật khẩu phải có ít nhất 8 ký tự' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Mật khẩu phải chứa ít nhất 1 chữ hoa, 1 chữ thường và 1 chữ số',
  })
  password: string;

  @ApiProperty({ example: 'Nguyễn Văn A', description: 'Họ và tên người dùng' })
  @IsString()
  @IsNotEmpty({ message: 'Họ và tên không được để trống' })
  fullName: string;

  @ApiPropertyOptional({ example: '0901234567', description: 'Số điện thoại liên hệ' })
  @IsOptional()
  @IsString()
  @Matches(/^[0-9]{10,11}$/, { message: 'Số điện thoại không hợp lệ (10-11 chữ số)' })
  phone?: string;
}

export class LoginDto {
  @ApiProperty({ example: 'customer@example.com', description: 'Email đăng nhập' })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email: string;

  @ApiProperty({ example: 'GlowUp@2026', description: 'Mật khẩu' })
  @IsString()
  @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
  password: string;
}

export class VerifyEmailDto {
  @ApiProperty({ description: 'Mã xác thực email gửi qua đường dẫn' })
  @IsString()
  @IsNotEmpty({ message: 'Mã xác thực không được để trống' })
  token: string;
}

export class ResendOtpDto {
  @ApiProperty({ example: 'customer@example.com', description: 'Email cần gửi lại mã xác thực' })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email: string;
}

export class RefreshTokenDto {
  @ApiProperty({ description: 'Refresh token để lấy access token mới' })
  @IsString()
  @IsNotEmpty({ message: 'Refresh token không được để trống' })
  refreshToken: string;
}

export class LogoutDto {
  @ApiProperty({ description: 'Refresh token của phiên đăng nhập cần đăng xuất' })
  @IsString()
  @IsNotEmpty({ message: 'Refresh token không được để trống' })
  refreshToken: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: 'customer@example.com', description: 'Email tài khoản cần đặt lại mật khẩu' })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty({ description: 'Token đặt lại mật khẩu nhận qua email' })
  @IsString()
  @IsNotEmpty({ message: 'Token không được để trống' })
  token: string;

  @ApiProperty({
    example: 'NewPassword@2026',
    description: 'Mật khẩu mới tối thiểu 8 ký tự, gồm chữ hoa, chữ thường và chữ số',
  })
  @IsString()
  @MinLength(8, { message: 'Mật khẩu phải có ít nhất 8 ký tự' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Mật khẩu phải chứa ít nhất 1 chữ hoa, 1 chữ thường và 1 chữ số',
  })
  newPassword: string;
}

export class AuthUserDto {
  @ApiProperty({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  id: string;

  @ApiProperty({ example: 'customer@example.com' })
  email: string;

  @ApiProperty({ example: 'Nguyễn Văn A' })
  fullName: string;

  @ApiPropertyOptional({ example: 'https://example.com/avatar.jpg' })
  avatarUrl?: string | null;

  @ApiPropertyOptional({ example: 'CUSTOMER' })
  roleName?: string;
}

export class LoginResponseDto {
  @ApiProperty({ description: 'JWT Access Token (hạn 15 phút)' })
  accessToken: string;

  @ApiProperty({ description: 'Refresh Token (hạn 7 ngày)' })
  refreshToken: string;

  @ApiProperty({ type: AuthUserDto })
  user: AuthUserDto;
}

export class RefreshTokenResponseDto {
  @ApiProperty({ description: 'JWT Access Token mới' })
  accessToken: string;

  @ApiProperty({ description: 'Refresh Token mới' })
  refreshToken: string;
}

export class MessageResponseDto {
  @ApiProperty({ example: 'Thao tác thành công' })
  message: string;
}
