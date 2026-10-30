import { Inject, Injectable } from '@nestjs/common';
import {
  ADMIN_USER_REPOSITORY,
  IAdminUserRepository,
} from '../../domain/repositories/admin-user.repository.interface';
import { AdminUser } from '../../domain/entities/admin-user.entity';

export interface GetAdminUsersInput {
  page: number;
  limit: number;
  order: 'ASC' | 'DESC';
  search?: string;
  roleId?: number;
  status?: string;
  storeId?: string;
}

@Injectable()
export class GetAdminUsersUseCase {
  constructor(
    @Inject(ADMIN_USER_REPOSITORY) private readonly repository: IAdminUserRepository,
  ) {}

  execute(input: GetAdminUsersInput): Promise<{ items: AdminUser[]; total: number }> {
    return this.repository.findAll({
      skip: (input.page - 1) * input.limit,
      take: input.limit,
      order: input.order === 'ASC' ? 'asc' : 'desc',
      search: input.search?.trim() || undefined,
      roleId: input.roleId,
      status: input.status,
      storeId: input.storeId,
    });
  }
}
