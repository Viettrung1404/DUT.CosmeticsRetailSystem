import { Module } from '@nestjs/common';
import { AuthController } from './presentation/controllers/auth.controller';
import { RegisterUseCase } from './application/use-cases/register.use-case';
import { LoginUseCase } from './application/use-cases/login.use-case';
import { VerifyEmailUseCase } from './application/use-cases/verify-email.use-case';
import { ResendOtpUseCase } from './application/use-cases/resend-otp.use-case';
import { RefreshTokenUseCase } from './application/use-cases/refresh-token.use-case';
import { LogoutUseCase } from './application/use-cases/logout.use-case';
import { ForgotPasswordUseCase } from './application/use-cases/forgot-password.use-case';
import { ResetPasswordUseCase } from './application/use-cases/reset-password.use-case';
import { GetMeUseCase } from './application/use-cases/get-me.use-case';
import { USER_REPOSITORY } from './domain/repositories/user.repository.interface';
import { VERIFICATION_TOKEN_REPOSITORY } from './domain/repositories/verification-token.repository.interface';
import { USER_SESSION_REPOSITORY } from './domain/repositories/user-session.repository.interface';
import { EMAIL_SERVICE } from './application/ports/email.port';
import { PrismaUserRepository } from './infrastructure/persistence/prisma-user.repository';
import { PrismaVerificationTokenRepository } from './infrastructure/persistence/prisma-verification-token.repository';
import { PrismaUserSessionRepository } from './infrastructure/persistence/prisma-user-session.repository';
import { BcryptService } from './infrastructure/adapters/bcrypt.service';
import { JwtTokenService } from './infrastructure/adapters/jwt.service';
import { NodemailerEmailService } from './infrastructure/adapters/nodemailer-email.service';
import { PermissionsModule } from '@modules/permissions/permissions.module';

@Module({
  imports: [PermissionsModule],
  controllers: [AuthController],
  providers: [
    // Use Cases
    RegisterUseCase,
    LoginUseCase,
    VerifyEmailUseCase,
    ResendOtpUseCase,
    RefreshTokenUseCase,
    LogoutUseCase,
    ForgotPasswordUseCase,
    ResetPasswordUseCase,
    GetMeUseCase,

    // Adapters & Services
    BcryptService,
    JwtTokenService,
    {
      provide: EMAIL_SERVICE,
      useClass: NodemailerEmailService,
    },

    // Repositories
    {
      provide: USER_REPOSITORY,
      useClass: PrismaUserRepository,
    },
    {
      provide: VERIFICATION_TOKEN_REPOSITORY,
      useClass: PrismaVerificationTokenRepository,
    },
    {
      provide: USER_SESSION_REPOSITORY,
      useClass: PrismaUserSessionRepository,
    },
  ],
  exports: [
    USER_REPOSITORY,
    USER_SESSION_REPOSITORY,
    VERIFICATION_TOKEN_REPOSITORY,
    BcryptService,
    JwtTokenService,
    RegisterUseCase,
    LoginUseCase,
    GetMeUseCase,
  ],
})
export class AuthModule {}

