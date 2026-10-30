import { Module } from '@nestjs/common';
import { UsersService } from './application/services/users.service';
import { UsersController } from './presentation/controllers/users.controller';
import { UserAdminController } from './presentation/controllers/user-admin.controller';
import { GetAdminUsersUseCase } from './application/use-cases/get-admin-users.use-case';
import { GetAdminUserDetailUseCase } from './application/use-cases/get-admin-user-detail.use-case';
import { CreateAdminUserUseCase } from './application/use-cases/create-admin-user.use-case';
import { UpdateAdminUserUseCase } from './application/use-cases/update-admin-user.use-case';
import { SetUserPermissionsUseCase } from './application/use-cases/set-user-permissions.use-case';
import { SetUserStoresUseCase } from './application/use-cases/set-user-stores.use-case';
import {
  GetPermissionsUseCase,
  GetRolesUseCase,
} from './application/use-cases/get-roles-and-permissions.use-case';
import { STAFF_MAILER } from './application/ports/staff-mailer.port';
import { ADMIN_USER_REPOSITORY } from './domain/repositories/admin-user.repository.interface';
import { PrismaAdminUserRepository } from './infrastructure/persistence/prisma-admin-user.repository';
import { StaffMailerService } from './infrastructure/adapters/staff-mailer.service';

@Module({
  controllers: [UsersController, UserAdminController],
  providers: [
    UsersService,
    GetAdminUsersUseCase,
    GetAdminUserDetailUseCase,
    CreateAdminUserUseCase,
    UpdateAdminUserUseCase,
    SetUserPermissionsUseCase,
    SetUserStoresUseCase,
    GetRolesUseCase,
    GetPermissionsUseCase,
    { provide: ADMIN_USER_REPOSITORY, useClass: PrismaAdminUserRepository },
    { provide: STAFF_MAILER, useClass: StaffMailerService },
  ],
  exports: [CreateAdminUserUseCase, ADMIN_USER_REPOSITORY],
})
export class UsersModule {}
