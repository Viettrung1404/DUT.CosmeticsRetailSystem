import { Inject, Injectable, BadRequestException } from '@nestjs/common';
import { UserEntity } from '../../domain/entities/user.entity';
import { USER_REPOSITORY, IUserRepository } from '../../domain/repositories/user.repository.interface';
import {
  VERIFICATION_TOKEN_REPOSITORY,
  IVerificationTokenRepository,
} from '../../domain/repositories/verification-token.repository.interface';
import {
  USER_SESSION_REPOSITORY,
  IUserSessionRepository,
} from '../../domain/repositories/user-session.repository.interface';
import { BcryptService } from '../../infrastructure/adapters/bcrypt.service';
import { UNIT_OF_WORK, IUnitOfWork } from '@core/database/unit-of-work.interface';
import * as crypto from 'crypto';

@Injectable()
export class ResetPasswordUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
    @Inject(VERIFICATION_TOKEN_REPOSITORY) private readonly tokenRepo: IVerificationTokenRepository,
    @Inject(USER_SESSION_REPOSITORY) private readonly sessionRepo: IUserSessionRepository,
    @Inject(UNIT_OF_WORK) private readonly unitOfWork: IUnitOfWork,
    private readonly bcryptService: BcryptService,
  ) {}

  async execute(token: string, newPassword: string): Promise<{ message: string }> {
    // 1. Validate password strength
    const passwordCheck = UserEntity.validatePassword(newPassword);
    if (!passwordCheck.valid) {
      throw new BadRequestException(passwordCheck.message);
    }

    // 2. Hash token for database lookup
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // 3. Find token
    const storedToken = await this.tokenRepo.findByTokenHash(tokenHash, 'PASSWORD_RESET');
    if (!storedToken) {
      throw new BadRequestException('Link đặt lại mật khẩu không hợp lệ');
    }

    if (storedToken.isUsed) {
      throw new BadRequestException('Link đã được sử dụng');
    }

    if (new Date() > storedToken.expiresAt) {
      throw new BadRequestException('Link đặt lại mật khẩu đã hết hạn');
    }

    // 4. Find user
    const user = await this.userRepo.findById(storedToken.userId!);
    if (!user) {
      throw new BadRequestException('Người dùng không tồn tại');
    }

    // 5, 6, 7. Atomic transaction for password update, token invalidation, and session revocation
    const newHash = await this.bcryptService.hash(newPassword);
    user.updatePasswordHash(newHash);

    await this.unitOfWork.runInTransaction(async () => {
      await this.userRepo.update(user);
      await this.tokenRepo.markAsUsed(storedToken.id);
      await this.sessionRepo.revokeAllByUserId(user.id!);
    });

    return { message: 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại.' };
  }
}
