import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  IPermissionRepository,
  PERMISSION_REPOSITORY,
} from '../../domain/repositories/permission.repository.interface';

// Nơi duy nhất được tính toán trên bitmask quyền (tài liệu 04_thiet_ke_csdl.md, mục 3.1 và A.4)
@Injectable()
export class GetUserEffectivePermissionsUseCase {
  constructor(
    @Inject(PERMISSION_REPOSITORY)
    private readonly permissionRepository: IPermissionRepository,
  ) {}

  async execute(userId: string): Promise<string[]> {
    const [masks, definitions] = await Promise.all([
      this.permissionRepository.findUserPermissionMasks(userId),
      this.permissionRepository.findAllDefinitions(),
    ]);

    if (!masks) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    const effective =
      (masks.rolePermissions | masks.extraPermissions) & ~masks.revokedPermissions;

    return definitions
      .filter((def) => (effective & (1n << BigInt(def.bitPosition))) !== 0n)
      .map((def) => def.permissionCode);
  }
}
