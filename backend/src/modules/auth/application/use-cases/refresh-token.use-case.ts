import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { USER_REPOSITORY, IUserRepository } from '../../domain/repositories/user.repository.interface';
import {
  USER_SESSION_REPOSITORY,
  IUserSessionRepository,
} from '../../domain/repositories/user-session.repository.interface';
import { JwtTokenService } from '../../infrastructure/adapters/jwt.service';
import { UNIT_OF_WORK, IUnitOfWork } from '@core/database/unit-of-work.interface';
import { GetUserEffectivePermissionsUseCase } from '@modules/permissions/application/use-cases/get-user-effective-permissions.use-case';

export interface RefreshTokenOutput {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class RefreshTokenUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
    @Inject(USER_SESSION_REPOSITORY) private readonly sessionRepo: IUserSessionRepository,
    @Inject(UNIT_OF_WORK) private readonly unitOfWork: IUnitOfWork,
    private readonly jwtService: JwtTokenService,
    private readonly getPermissionsUseCase: GetUserEffectivePermissionsUseCase,
  ) {}

  async execute(oldRefreshToken: string): Promise<RefreshTokenOutput> {
    // 1. Look up session by refresh token
    const session = await this.sessionRepo.findByRefreshToken(oldRefreshToken);
    if (!session) {
      throw new UnauthorizedException('Refresh token không hợp lệ');
    }

    // 2. Check if session has been revoked
    if (session.isRevoked) {
      throw new UnauthorizedException('Refresh token đã bị thu hồi');
    }

    // 3. Check if session has expired
    if (new Date() > session.expiresAt) {
      throw new UnauthorizedException('Refresh token đã hết hạn');
    }

    // 4. Look up user
    const user = await this.userRepo.findById(session.userId);
    if (!user || !user.canLogin()) {
      throw new UnauthorizedException('Tài khoản không hợp lệ');
    }

    // 5. Compute effective permissions via Permissions service
    const permissionCodes = await this.getPermissionsUseCase.execute(user.id!);

    // 6. Generate new token pair
    const accessToken = this.jwtService.generateAccessToken({
      userId: user.id!,
      roleId: user.roleId,
      roleName: user.roleName || 'Customer',
      dataScope: user.dataScope || 'SELF',
      permissionCodes,
    });

    const newRefreshToken = this.jwtService.generateRefreshToken(user.id!);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // 7. Token Rotation: Revoke old session and persist new session in atomic transaction
    await this.unitOfWork.runInTransaction(async () => {
      await this.sessionRepo.revokeById(session.id);
      await this.sessionRepo.create({
        userId: user.id!,
        refreshToken: newRefreshToken,
        expiresAt,
      });
    });

    return { accessToken, refreshToken: newRefreshToken };
  }
}

