import { User as PrismaUser, Role as PrismaRole } from '@prisma/client';
import { UserEntity } from '../../domain/entities/user.entity';

export type PrismaUserWithRole = PrismaUser & {
  role?: PrismaRole | null;
};

export class UserMapper {
  static toDomain(raw: PrismaUserWithRole): UserEntity {
    return new UserEntity({
      id: raw.id,
      roleId: raw.roleId,
      email: raw.email,
      passwordHash: raw.passwordHash,
      phone: raw.phone,
      fullName: raw.fullName,
      avatarUrl: raw.avatarUrl,
      status: raw.status,
      emailVerified: raw.emailVerified,
      phoneVerified: raw.phoneVerified,
      extraPermissions: raw.extraPermissions,
      revokedPermissions: raw.revokedPermissions,
      lastLoginAt: raw.lastLoginAt,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      roleName: raw.role?.name,
      rolePermissions: raw.role?.permissions,
      dataScope: raw.role?.dataScope,
    });
  }

  static toPersistence(entity: UserEntity): {
    id?: string;
    roleId: number;
    email: string;
    passwordHash?: string | null;
    phone?: string | null;
    fullName: string;
    avatarUrl?: string | null;
    status: string;
    emailVerified: boolean;
    phoneVerified: boolean;
    extraPermissions: bigint;
    revokedPermissions: bigint;
    lastLoginAt?: Date | null;
  } {
    return {
      id: entity.id,
      roleId: entity.roleId,
      email: entity.email,
      passwordHash: entity.passwordHash,
      phone: entity.phone,
      fullName: entity.fullName,
      avatarUrl: entity.avatarUrl,
      status: entity.status,
      emailVerified: entity.emailVerified,
      phoneVerified: entity.phoneVerified,
      extraPermissions: entity.extraPermissions,
      revokedPermissions: entity.revokedPermissions,
      lastLoginAt: entity.lastLoginAt,
    };
  }
}
