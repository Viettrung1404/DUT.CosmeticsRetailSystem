import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import {
  IPermissionRepository,
  PermissionDefinition,
  UserPermissionMasks,
} from '../../domain/repositories/permission.repository.interface';

@Injectable()
export class PrismaPermissionRepository implements IPermissionRepository {
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
      rolePermissions: user.role.permissions,
      extraPermissions: user.extraPermissions,
      revokedPermissions: user.revokedPermissions,
    };
  }

  async findAllDefinitions(): Promise<PermissionDefinition[]> {
    return this.prisma.permission.findMany({
      select: { bitPosition: true, permissionCode: true },
      orderBy: { bitPosition: 'asc' },
    });
  }
}
