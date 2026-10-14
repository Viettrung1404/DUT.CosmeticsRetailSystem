import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { IUserSessionRepository } from '../../domain/repositories/user-session.repository.interface';

@Injectable()
export class PrismaUserSessionRepository implements IUserSessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    userId: string;
    refreshToken: string;
    deviceInfo?: string;
    ipAddress?: string;
    expiresAt: Date;
    expectedPasswordHash?: string;
  }): Promise<{ id: string }> {
    return this.prisma.transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM users WHERE id=${data.userId}::uuid FOR UPDATE`;
      const user = await tx.user.findUniqueOrThrow({
        where: { id: data.userId },
      });
      if (
        user.status !== 'ACTIVE' ||
        (data.expectedPasswordHash &&
          (user.passwordHash !== data.expectedPasswordHash ||
            !user.emailVerified))
      )
        throw new UnauthorizedException('Tài khoản hoặc mật khẩu vừa thay đổi');
      return tx.userSession.create({
        data: {
          userId: data.userId,
          refreshToken: data.refreshToken,
          deviceInfo: data.deviceInfo,
          ipAddress: data.ipAddress,
          expiresAt: data.expiresAt,
        },
        select: { id: true },
      });
    });
  }

  async findByRefreshToken(refreshToken: string): Promise<{
    id: string;
    userId: string;
    refreshToken: string;
    isRevoked: boolean;
    expiresAt: Date;
  } | null> {
    return this.prisma.userSession.findUnique({
      where: { refreshToken },
      select: {
        id: true,
        userId: true,
        refreshToken: true,
        isRevoked: true,
        expiresAt: true,
      },
    });
  }

  async revokeById(id: string): Promise<void> {
    const session = await this.prisma.userSession.findUnique({ where: { id } });
    if (!session) return;
    await this.prisma.transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM users WHERE id=${session.userId}::uuid FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM user_sessions WHERE id=${id}::uuid FOR UPDATE`;
      await tx.userSession.update({
        where: { id },
        data: { isRevoked: true },
      });
    });
  }

  async rotateActive(
    oldToken: string,
    newToken: string,
    expiresAt: Date,
  ): Promise<{ id: string; userId: string } | null> {
    const found = await this.findByRefreshToken(oldToken);
    if (!found) return null;
    return this.prisma.transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM users WHERE id=${found.userId}::uuid FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM user_sessions WHERE id=${found.id}::uuid FOR UPDATE`;
      const user = await tx.user.findUnique({
        where: { id: found.userId },
        select: { status: true },
      });
      if (user?.status !== 'ACTIVE') return null;
      const changed = await tx.userSession.updateMany({
        where: {
          id: found.id,
          refreshToken: oldToken,
          isRevoked: false,
          expiresAt: { gt: new Date() },
        },
        data: { refreshToken: newToken, expiresAt },
      });
      return changed.count === 1
        ? { id: found.id, userId: found.userId }
        : null;
    });
  }

  async revokeAllByUserId(userId: string): Promise<void> {
    await this.prisma.transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM users WHERE id=${userId}::uuid FOR UPDATE`;
      await tx.userSession.updateMany({
        where: {
          userId,
          isRevoked: false,
        },
        data: { isRevoked: true },
      });
    });
  }

  async revokeAllByUserIdExcept(
    userId: string,
    exceptSessionId: string,
  ): Promise<void> {
    await this.prisma.transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM users WHERE id=${userId}::uuid FOR UPDATE`;
      await tx.userSession.updateMany({
        where: {
          userId,
          id: { not: exceptSessionId },
          isRevoked: false,
        },
        data: { isRevoked: true },
      });
    });
  }
}
