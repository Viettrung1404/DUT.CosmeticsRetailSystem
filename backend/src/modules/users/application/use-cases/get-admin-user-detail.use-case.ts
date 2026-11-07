import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  ADMIN_USER_REPOSITORY,
  IAdminUserRepository,
} from '../../domain/repositories/admin-user.repository.interface';
import { AdminUser } from '../../domain/entities/admin-user.entity';

@Injectable()
export class GetAdminUserDetailUseCase {
  constructor(
    @Inject(ADMIN_USER_REPOSITORY) private readonly repository: IAdminUserRepository,
  ) {}

  async execute(id: string): Promise<AdminUser> {
    const user = await this.repository.findById(id);
    if (!user) throw new NotFoundException('Không tìm thấy người dùng');
    return user;
  }
}
