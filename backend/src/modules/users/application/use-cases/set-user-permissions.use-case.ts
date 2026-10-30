import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  ADMIN_USER_REPOSITORY,
  IAdminUserRepository,
} from '../../domain/repositories/admin-user.repository.interface';
import { AdminUser } from '../../domain/entities/admin-user.entity';

const MAX_BIT_COUNT = 63n;

export interface SetUserPermissionsInput {
  extraPermissions?: string;
  revokedPermissions?: string;
}

const parseMask = (value: string): bigint => {
  try {
    const mask = BigInt(value);
    if (mask < 0n || mask >> MAX_BIT_COUNT !== 0n) throw new Error('out of range');
    return mask;
  } catch {
    throw new BadRequestException('Mặt nạ quyền phải là số nguyên không âm, tối đa 63 bit');
  }
};

@Injectable()
export class SetUserPermissionsUseCase {
  constructor(
    @Inject(ADMIN_USER_REPOSITORY) private readonly repository: IAdminUserRepository,
  ) {}

  async execute(actorId: string, id: string, input: SetUserPermissionsInput): Promise<AdminUser> {
    const current = await this.repository.findById(id);
    if (!current) throw new NotFoundException('Không tìm thấy người dùng');

    const extra =
      input.extraPermissions !== undefined
        ? parseMask(input.extraPermissions)
        : current.extraPermissions;
    const revoked =
      input.revokedPermissions !== undefined
        ? parseMask(input.revokedPermissions)
        : current.revokedPermissions;

    if ((extra & revoked) !== 0n) {
      throw new BadRequestException('Một quyền không thể vừa được cấp thêm vừa bị thu hồi');
    }

    const definitions = await this.repository.findPermissions();
    const known = definitions.reduce((acc, p) => acc | (1n << BigInt(p.bitPosition)), 0n);
    if (((extra | revoked) & ~known) !== 0n) {
      throw new BadRequestException('Có bit quyền không tồn tại trong hệ thống');
    }

    if (actorId === id && (revoked & ~current.revokedPermissions) !== 0n) {
      throw new BadRequestException('Không thể tự thu hồi quyền của chính mình');
    }

    return this.repository.setPermissions(id, extra, revoked, {
      actorId,
      action: 'USER_PERMISSIONS_UPDATE',
      entityId: id,
      oldData: {
        extraPermissions: current.extraPermissions.toString(),
        revokedPermissions: current.revokedPermissions.toString(),
      },
      newData: { extraPermissions: extra.toString(), revokedPermissions: revoked.toString() },
    });
  }
}
