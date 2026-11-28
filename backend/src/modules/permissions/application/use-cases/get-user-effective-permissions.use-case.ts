import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  IPermissionRepository,
  PERMISSION_REPOSITORY,
} from '../../domain/repositories/permission.repository.interface';

// Nơi duy nhất được tính toán trên bitmask quyền (tài liệu 04_thiet_ke_csdl.md, mục 3.1 và A.4)
@Injectable()
export class GetUserEffectivePermissionsUseCase {
  private readonly permissionCache = new Map<
    string,
    { permissions: string[]; expiresAt: number }
  >();

  constructor(
    @Inject(PERMISSION_REPOSITORY)
    private readonly permissionRepository: IPermissionRepository,
  ) {}

  async execute(userId: string): Promise<string[]> {
    const now = Date.now();
    const cached = this.permissionCache.get(userId);
    if (cached && cached.expiresAt > now) {
      return cached.permissions;
    }

    const [masks, definitions] = await Promise.all([
      this.permissionRepository.findUserPermissionMasks(userId),
      this.permissionRepository.findAllDefinitions(),
    ]);

    if (!masks) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    const effective =
      (masks.rolePermissions | masks.extraPermissions) & ~masks.revokedPermissions;

    const permissions = definitions
      .filter((def) => (effective & (1n << BigInt(def.bitPosition))) !== 0n)
      .map((def) => def.permissionCode);

    this.permissionCache.set(userId, { permissions, expiresAt: now + 15000 });
    if (this.permissionCache.size > 2000) {
      for (const [k, v] of this.permissionCache.entries()) {
        if (v.expiresAt <= now) this.permissionCache.delete(k);
      }
    }

    return permissions;
  }
}
