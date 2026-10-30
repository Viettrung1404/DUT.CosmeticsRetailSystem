import { Inject, Injectable } from '@nestjs/common';
import {
  ADMIN_USER_REPOSITORY,
  IAdminUserRepository,
} from '../../domain/repositories/admin-user.repository.interface';
import { AdminPermission, AdminRole } from '../../domain/entities/admin-user.entity';

@Injectable()
export class GetRolesUseCase {
  constructor(
    @Inject(ADMIN_USER_REPOSITORY) private readonly repository: IAdminUserRepository,
  ) {}

  execute(): Promise<AdminRole[]> {
    return this.repository.findRoles();
  }
}

@Injectable()
export class GetPermissionsUseCase {
  constructor(
    @Inject(ADMIN_USER_REPOSITORY) private readonly repository: IAdminUserRepository,
  ) {}

  execute(): Promise<AdminPermission[]> {
    return this.repository.findPermissions();
  }
}
