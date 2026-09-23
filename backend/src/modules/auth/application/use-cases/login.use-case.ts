import { Inject, Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { USER_REPOSITORY, IUserRepository } from '../../domain/repositories/user.repository.interface';
import {
  USER_SESSION_REPOSITORY,
  IUserSessionRepository,
} from '../../domain/repositories/user-session.repository.interface';
import { BcryptService } from '../../infrastructure/adapters/bcrypt.service';
import { JwtTokenService } from '../../infrastructure/adapters/jwt.service';
import { PrismaService } from '@infrastructure/database/prisma.service';

export interface LoginInput {
  email: string;
  password: string;
  deviceInfo?: string;
  ipAddress?: string;
}

export interface LoginOutput {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    fullName: string;
    avatarUrl: string | null | undefined;
    roleName: string | undefined;
  };
}

@Injectable()
export class LoginUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
    @Inject(USER_SESSION_REPOSITORY) private readonly sessionRepo: IUserSessionRepository,
    private readonly bcryptService: BcryptService,
    private readonly jwtService: JwtTokenService,
    private readonly prisma: PrismaService,
  ) {}

  async execute(input: LoginInput): Promise<LoginOutput> {
    // 1. Find user by email
    const user = await this.userRepo.findByEmail(input.email);
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    // 2. Check account status
    if (!user.canLogin()) {
      if (user.status === 'BANNED') {
        throw new ForbiddenException('Tài khoản đã bị khóa vĩnh viễn');
      }
      if (user.status === 'INACTIVE') {
        throw new ForbiddenException('Tài khoản đã bị vô hiệu hóa');
      }
      throw new ForbiddenException('Tài khoản không thể đăng nhập');
    }

    // 3. Check email verified
    if (!user.isEmailVerified()) {
      throw new ForbiddenException('Email chưa được xác thực. Vui lòng kiểm tra email.');
    }

    // 4. Verify password
    const isPasswordValid = await this.bcryptService.compare(input.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    // 5. Compute effective permissions
    const permissionCodes = await this.getPermissionCodes(user.getEffectivePermissions());

    // 6. Generate JWT tokens
    const accessToken = this.jwtService.generateAccessToken({
      userId: user.id!,
      roleId: user.roleId,
      roleName: user.roleName || 'Customer',
      dataScope: user.dataScope || 'SELF',
      permissionCodes,
    });

    const refreshToken = this.jwtService.generateRefreshToken(user.id!);

    // 7. Persist refresh token session
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await this.sessionRepo.create({
      userId: user.id!,
      refreshToken,
      deviceInfo: input.deviceInfo,
      ipAddress: input.ipAddress,
      expiresAt,
    });

    // 8. Update last_login_at
    await this.userRepo.updateLastLogin(user.id!);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id!,
        email: user.email,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
        roleName: user.roleName,
      },
    };
  }

  /**
   * Decode effective permission bitmask to permission code strings.
   */
  private async getPermissionCodes(effectivePerms: bigint): Promise<string[]> {
    if (effectivePerms === BigInt(0)) return [];

    const permissions = await this.prisma.permission.findMany();
    return permissions
      .filter((p) => (effectivePerms & p.bitValue) !== BigInt(0))
      .map((p) => p.permissionCode);
  }
}
