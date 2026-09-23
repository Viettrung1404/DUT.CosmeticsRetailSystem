import { Inject, Injectable } from '@nestjs/common';
import {
  USER_SESSION_REPOSITORY,
  IUserSessionRepository,
} from '../../domain/repositories/user-session.repository.interface';

@Injectable()
export class LogoutUseCase {
  constructor(
    @Inject(USER_SESSION_REPOSITORY) private readonly sessionRepo: IUserSessionRepository,
  ) {}

  async execute(refreshToken: string): Promise<{ message: string }> {
    // Find and revoke session
    const session = await this.sessionRepo.findByRefreshToken(refreshToken);
    if (session && !session.isRevoked) {
      await this.sessionRepo.revokeById(session.id);
    }

    return { message: 'Đăng xuất thành công' };
  }
}
