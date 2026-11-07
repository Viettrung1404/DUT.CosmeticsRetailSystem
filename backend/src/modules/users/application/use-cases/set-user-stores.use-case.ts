import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  ADMIN_USER_REPOSITORY,
  IAdminUserRepository,
} from '../../domain/repositories/admin-user.repository.interface';
import { AdminUser } from '../../domain/entities/admin-user.entity';

@Injectable()
export class SetUserStoresUseCase {
  constructor(
    @Inject(ADMIN_USER_REPOSITORY) private readonly repository: IAdminUserRepository,
  ) {}

  async execute(actorId: string, id: string, storeIds: string[]): Promise<AdminUser> {
    const current = await this.repository.findById(id);
    if (!current) throw new NotFoundException('Không tìm thấy người dùng');

    const unique = [...new Set(storeIds)];
    if (unique.length > 0) {
      const found = await this.repository.findExistingStoreIds(unique);
      if (found.length !== unique.length) {
        throw new BadRequestException('Có cửa hàng không tồn tại');
      }
    }

    return this.repository.setStores(id, unique, {
      actorId,
      action: 'USER_STORES_UPDATE',
      entityId: id,
      oldData: { storeIds: current.stores.map((s) => s.id) },
      newData: { storeIds: unique },
    });
  }
}
