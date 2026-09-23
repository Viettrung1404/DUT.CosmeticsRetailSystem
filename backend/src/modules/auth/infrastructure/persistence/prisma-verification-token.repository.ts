import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { IVerificationTokenRepository } from '../../domain/repositories/verification-token.repository.interface';

@Injectable()
export class PrismaVerificationTokenRepository implements IVerificationTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    userId: string;
    tokenHash: string;
    type: string;
    expiresAt: Date;
  }): Promise<{ id: string }> {
    return this.prisma.verificationToken.create({
      data: {
        userId: data.userId,
        tokenHash: data.tokenHash,
        type: data.type,
        expiresAt: data.expiresAt,
      },
      select: { id: true },
    });
  }

  async findByTokenHash(
    tokenHash: string,
    type: string,
  ): Promise<{
    id: string;
    userId: string | null;
    tokenHash: string;
    type: string;
    expiresAt: Date;
    isUsed: boolean;
  } | null> {
    return this.prisma.verificationToken.findFirst({
      where: { tokenHash, type },
      select: {
        id: true,
        userId: true,
        tokenHash: true,
        type: true,
        expiresAt: true,
        isUsed: true,
      },
    });
  }

  async markAsUsed(id: string): Promise<void> {
    await this.prisma.verificationToken.update({
      where: { id },
      data: { isUsed: true },
    });
  }

  async countRecentByUserId(userId: string, type: string, since: Date): Promise<number> {
    return this.prisma.verificationToken.count({
      where: {
        userId,
        type,
        createdAt: { gte: since },
      },
    });
  }

  async invalidateAllByUserId(userId: string, type: string): Promise<void> {
    await this.prisma.verificationToken.updateMany({
      where: {
        userId,
        type,
        isUsed: false,
      },
      data: { isUsed: true },
    });
  }
}
