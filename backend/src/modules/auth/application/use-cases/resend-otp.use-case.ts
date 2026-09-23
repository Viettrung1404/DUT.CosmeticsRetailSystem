import { Inject, Injectable, BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { USER_REPOSITORY, IUserRepository } from '../../domain/repositories/user.repository.interface';
import {
  VERIFICATION_TOKEN_REPOSITORY,
  IVerificationTokenRepository,
} from '../../domain/repositories/verification-token.repository.interface';
import { EMAIL_SERVICE, IEmailService } from '../ports/email.port';
import * as crypto from 'crypto';

@Injectable()
export class ResendOtpUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
    @Inject(VERIFICATION_TOKEN_REPOSITORY) private readonly tokenRepo: IVerificationTokenRepository,
    @Inject(EMAIL_SERVICE) private readonly emailService: IEmailService,
  ) {}

  async execute(email: string): Promise<{ message: string }> {
    // 1. Find user
    const user = await this.userRepo.findByEmail(email);
    if (!user) {
      // Do not disclose whether email exists (security best practice)
      return { message: 'Nếu email tồn tại, mã xác thực mới đã được gửi' };
    }

    if (user.isEmailVerified()) {
      throw new BadRequestException('Email đã được xác thực');
    }

    // 2. Rate limiting: maximum 3 requests per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentCount = await this.tokenRepo.countRecentByUserId(
      user.id!,
      'EMAIL_VERIFICATION',
      oneHourAgo,
    );

    if (recentCount >= 3) {
      throw new HttpException(
        'Đã gửi quá 3 lần trong 1 giờ. Vui lòng thử lại sau.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // 3. Invalidate older verification tokens
    await this.tokenRepo.invalidateAllByUserId(user.id!, 'EMAIL_VERIFICATION');

    // 4. Generate new verification token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    await this.tokenRepo.create({
      userId: user.id!,
      tokenHash,
      type: 'EMAIL_VERIFICATION',
      expiresAt,
    });

    // 5. Send verification email
    await this.emailService.sendVerificationEmail(user.email, user.fullName, rawToken);

    return { message: 'Mã xác thực mới đã được gửi' };
  }
}
