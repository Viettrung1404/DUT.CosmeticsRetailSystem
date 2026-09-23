import { Injectable } from '@nestjs/common';
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
  }): Promise<{ id: string }> {
    return this.prisma.userSession.create({
      data: {
        userId: data.userId,
        refreshToken: data.refreshToken,
        deviceInfo: data.deviceInfo,
        ipAddress: data.ipAddress,
        expiresAt: data.expiresAt,
      },
      select: { id: true },
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
    await this.prisma.userSession.update({
      where: { id },
      data: { isRevoked: true },
    });
  }

  async revokeAllByUserId(userId: string): Promise<void> {
    await this.prisma.userSession.updateMany({
      where: {
        userId,
        isRevoked: false,
      },
      data: { isRevoked: true },
    });
  }

  async revokeAllByUserIdExcept(userId: string, exceptSessionId: string): Promise<void> {
    await this.prisma.userSession.updateMany({
      where: {
        userId,
        id: { not: exceptSessionId },
        isRevoked: false,
      },
      data: { isRevoked: true },
    });
  }
}
