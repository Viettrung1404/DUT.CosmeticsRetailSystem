import { Inject, Injectable, BadRequestException } from '@nestjs/common';
import { USER_REPOSITORY, IUserRepository } from '../../domain/repositories/user.repository.interface';
import {
  VERIFICATION_TOKEN_REPOSITORY,
  IVerificationTokenRepository,
} from '../../domain/repositories/verification-token.repository.interface';
import { EMAIL_SERVICE, IEmailService } from '../ports/email.port';
import { UNIT_OF_WORK, IUnitOfWork } from '@core/database/unit-of-work.interface';
import * as crypto from 'crypto';

@Injectable()
export class VerifyEmailUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
    @Inject(VERIFICATION_TOKEN_REPOSITORY) private readonly tokenRepo: IVerificationTokenRepository,
    @Inject(EMAIL_SERVICE) private readonly emailService: IEmailService,
    @Inject(UNIT_OF_WORK) private readonly unitOfWork: IUnitOfWork,
  ) {}

  async execute(token: string): Promise<{ message: string }> {
    // 1. Hash token for database lookup
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // 2. Find token in database
    const storedToken = await this.tokenRepo.findByTokenHash(tokenHash, 'EMAIL_VERIFICATION');
    if (!storedToken) {
      throw new BadRequestException('Mã xác thực không hợp lệ');
    }

    // 3. Check if token was already used
    if (storedToken.isUsed) {
      throw new BadRequestException('Mã xác thực đã được sử dụng');
    }

    // 4. Check if token has expired
    if (new Date() > storedToken.expiresAt) {
      throw new BadRequestException('Mã xác thực đã hết hạn');
    }

    // 5. Find user
    const user = await this.userRepo.findById(storedToken.userId!);
    if (!user) {
      throw new BadRequestException('Người dùng không tồn tại');
    }

    // 6 & 7. Atomically mark email as verified and invalidate token within a transaction
    await this.unitOfWork.runInTransaction(async () => {
      user.verifyEmail();
      await this.userRepo.update(user);
      await this.tokenRepo.markAsUsed(storedToken.id);
    });

    // 8. Send welcome email after transaction successfully commits
    await this.emailService.sendWelcomeEmail(user.email, user.fullName);

    return { message: 'Xác thực email thành công' };
  }
}
