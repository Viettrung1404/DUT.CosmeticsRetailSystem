import { Inject, Injectable } from '@nestjs/common';
import { USER_REPOSITORY, IUserRepository } from '../../domain/repositories/user.repository.interface';
import {
  VERIFICATION_TOKEN_REPOSITORY,
  IVerificationTokenRepository,
} from '../../domain/repositories/verification-token.repository.interface';
import { EMAIL_SERVICE, IEmailService } from '../ports/email.port';
import * as crypto from 'crypto';

@Injectable()
export class ForgotPasswordUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
    @Inject(VERIFICATION_TOKEN_REPOSITORY) private readonly tokenRepo: IVerificationTokenRepository,
    @Inject(EMAIL_SERVICE) private readonly emailService: IEmailService,
  ) {}

  async execute(email: string): Promise<{ message: string }> {
    // 1. Find user - do not leak whether the email exists (security best practice)
    const user = await this.userRepo.findByEmail(email);
    if (!user) {
      return { message: 'Nếu email tồn tại, link đặt lại mật khẩu đã được gửi' };
    }

    // 2. Invalidate previous tokens
    await this.tokenRepo.invalidateAllByUserId(user.id!, 'PASSWORD_RESET');

    // 3. Generate new reset token (TTL 30 mins)
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    await this.tokenRepo.create({
      userId: user.id!,
      tokenHash,
      type: 'PASSWORD_RESET',
      expiresAt,
    });

    // 4. Send reset email
    await this.emailService.sendPasswordResetEmail(user.email, user.fullName, rawToken);

    return { message: 'Nếu email tồn tại, link đặt lại mật khẩu đã được gửi' };
  }
}
