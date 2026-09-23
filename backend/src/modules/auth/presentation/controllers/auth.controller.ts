import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { Public } from '@core/decorators/public.decorator';
import { CurrentUser } from '@core/decorators/current-user.decorator';
import { JwtPayload } from '@core/guards/jwt-auth.guard';
import { RegisterUseCase } from '../../application/use-cases/register.use-case';
import { LoginUseCase } from '../../application/use-cases/login.use-case';
import { VerifyEmailUseCase } from '../../application/use-cases/verify-email.use-case';
import { ResendOtpUseCase } from '../../application/use-cases/resend-otp.use-case';
import { RefreshTokenUseCase } from '../../application/use-cases/refresh-token.use-case';
import { LogoutUseCase } from '../../application/use-cases/logout.use-case';
import { ForgotPasswordUseCase } from '../../application/use-cases/forgot-password.use-case';
import { ResetPasswordUseCase } from '../../application/use-cases/reset-password.use-case';
import {
  ForgotPasswordDto,
  LoginDto,
  LoginResponseDto,
  LogoutDto,
  MessageResponseDto,
  RefreshTokenDto,
  RefreshTokenResponseDto,
  RegisterDto,
  ResetPasswordDto,
  ResendOtpDto,
  VerifyEmailDto,
} from '../dtos/auth.dto';
import { IUserRepository, USER_REPOSITORY } from '../../domain/repositories/user.repository.interface';
import { Inject } from '@nestjs/common';

@ApiTags('Auth (Xác thực & Người dùng)')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly registerUseCase: RegisterUseCase,
    private readonly loginUseCase: LoginUseCase,
    private readonly verifyEmailUseCase: VerifyEmailUseCase,
    private readonly resendOtpUseCase: ResendOtpUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
    private readonly logoutUseCase: LogoutUseCase,
    private readonly forgotPasswordUseCase: ForgotPasswordUseCase,
    private readonly resetPasswordUseCase: ResetPasswordUseCase,
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
  ) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Đăng ký tài khoản khách hàng mới' })
  @ApiCreatedResponse({ description: 'Đăng ký thành công, vui lòng kiểm tra email', type: MessageResponseDto })
  async register(@Body() dto: RegisterDto) {
    return this.registerUseCase.execute(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đăng nhập vào hệ thống' })
  @ApiOkResponse({ description: 'Đăng nhập thành công', type: LoginResponseDto })
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    const ipAddress = req.ip || (req.headers['x-forwarded-for'] as string) || undefined;
    const deviceInfo = req.headers['user-agent'] || undefined;

    return this.loginUseCase.execute({
      email: dto.email,
      password: dto.password,
      ipAddress,
      deviceInfo,
    });
  }

  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xác thực tài khoản qua email token' })
  @ApiOkResponse({ description: 'Xác thực thành công', type: MessageResponseDto })
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.verifyEmailUseCase.execute(dto.token);
  }

  @Public()
  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Gửi lại email xác thực (giới hạn 3 lần/giờ)' })
  @ApiOkResponse({ description: 'Đã gửi lại email xác thực', type: MessageResponseDto })
  async resendVerification(@Body() dto: ResendOtpDto) {
    return this.resendOtpUseCase.execute(dto.email);
  }

  @Public()
  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Làm mới Access Token bằng Refresh Token (Token Rotation)' })
  @ApiOkResponse({ description: 'Lấy token mới thành công', type: RefreshTokenResponseDto })
  async refreshToken(@Body() dto: RefreshTokenDto) {
    return this.refreshTokenUseCase.execute(dto.refreshToken);
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đăng xuất khỏi phiên hiện tại' })
  @ApiOkResponse({ description: 'Đăng xuất thành công', type: MessageResponseDto })
  async logout(@Body() dto: LogoutDto) {
    return this.logoutUseCase.execute(dto.refreshToken);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Yêu cầu link đặt lại mật khẩu qua email' })
  @ApiOkResponse({ description: 'Nếu email tồn tại, link đã được gửi', type: MessageResponseDto })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.forgotPasswordUseCase.execute(dto.email);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đặt lại mật khẩu mới bằng token xác nhận' })
  @ApiOkResponse({ description: 'Đổi mật khẩu thành công', type: MessageResponseDto })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.resetPasswordUseCase.execute(dto.token, dto.newPassword);
  }

  @Get('me')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Lấy thông tin tài khoản hiện tại' })
  @ApiOkResponse({ description: 'Thông tin tài khoản đang đăng nhập' })
  async getMe(@CurrentUser() currentUser: JwtPayload) {
    const user = await this.userRepo.findById(currentUser.userId);
    if (!user) {
      return null;
    }
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      roleName: user.roleName,
      dataScope: user.dataScope,
      emailVerified: user.emailVerified,
      phoneVerified: user.phoneVerified,
      createdAt: user.createdAt,
    };
  }
}
