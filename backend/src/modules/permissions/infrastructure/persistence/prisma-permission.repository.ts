import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import {
  IPermissionRepository,
  PermissionDefinition,
  UserPermissionMasks,
} from '../../domain/repositories/permission.repository.interface';

@Injectable()
export class PrismaPermissionRepository implements IPermissionRepository {
  private cachedDefinitions: PermissionDefinition[] | null = null;

  constructor(private readonly prisma: PrismaService) {}

  async findUserPermissionMasks(userId: string): Promise<UserPermissionMasks | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        extraPermissions: true,
        revokedPermissions: true,
        role: { select: { permissions: true } },
      },
    });

    if (!user) {
      return null;
    }

    return {
      rolePermissions: user.role?.permissions ?? 0n,
      extraPermissions: user.extraPermissions,
      revokedPermissions: user.revokedPermissions,
    };
  }

  async findAllDefinitions(): Promise<PermissionDefinition[]> {
    if (this.cachedDefinitions) {
      return this.cachedDefinitions;
    }

    this.cachedDefinitions = await this.prisma.permission.findMany({
      select: { bitPosition: true, permissionCode: true },
      orderBy: { bitPosition: 'asc' },
    });

    return this.cachedDefinitions;
  }
}

