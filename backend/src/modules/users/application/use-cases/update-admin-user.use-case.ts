import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ADMIN_USER_REPOSITORY,
  AuditEntry,
  IAdminUserRepository,
  UserPatch,
} from '../../domain/repositories/admin-user.repository.interface';
import { ADMIN_ROLE_ID, AdminUser, USER_STATUSES } from '../../domain/entities/admin-user.entity';

@Injectable()
export class UpdateAdminUserUseCase {
  constructor(
    @Inject(ADMIN_USER_REPOSITORY) private readonly repository: IAdminUserRepository,
  ) {}

  async execute(
    actor: { userId: string; roleId: number },
    id: string,
    input: UserPatch,
  ): Promise<AdminUser> {
    const current = await this.repository.findById(id);
    if (!current) throw new NotFoundException('Không tìm thấy người dùng');

    const patch: UserPatch = {};
    if (input.fullName !== undefined) patch.fullName = input.fullName.trim();

    if (input.phone !== undefined) {
      const phone = input.phone?.trim() || null;
      if (phone && phone !== current.phone) {
        const owner = await this.repository.findByPhone(phone);
        if (owner && owner.id !== id) throw new ConflictException('Số điện thoại đã được sử dụng');
      }
      patch.phone = phone;
    }

    if (input.roleId !== undefined && input.roleId !== current.roleId) {
      if (actor.userId === id) {
        throw new BadRequestException('Không thể tự đổi vai trò của chính mình');
      }
      if (input.roleId === ADMIN_ROLE_ID && actor.roleId !== ADMIN_ROLE_ID) {
        throw new ForbiddenException('Chỉ Admin mới được gán vai trò Admin');
      }
      if (!(await this.repository.findRoleById(input.roleId))) {
        throw new BadRequestException('Vai trò không tồn tại');
      }
      patch.roleId = input.roleId;
    }

    let lock = false;
    if (input.status !== undefined && input.status !== current.status) {
      if (!(USER_STATUSES as readonly string[]).includes(input.status)) {
        throw new BadRequestException('Trạng thái không hợp lệ');
      }
      if (actor.userId === id && input.status !== 'ACTIVE') {
        throw new BadRequestException('Không thể tự khóa tài khoản của chính mình');
      }
      patch.status = input.status;
      lock = input.status !== 'ACTIVE';
    }

    if (Object.keys(patch).length === 0) return current;

    const audit: AuditEntry | undefined =
      patch.roleId !== undefined || patch.status !== undefined
        ? {
            actorId: actor.userId,
            action: 'USER_UPDATE',
            entityId: id,
            oldData: { roleId: current.roleId, status: current.status },
            newData: {
              roleId: patch.roleId ?? current.roleId,
              status: patch.status ?? current.status,
            },
          }
        : undefined;

    const updated = await this.repository.update(id, patch, audit);
    if (lock) await this.repository.revokeSessions(id);
    return updated;
  }
}
