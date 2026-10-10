import { Module } from '@nestjs/common';
import { GetUserEffectivePermissionsUseCase } from './application/use-cases/get-user-effective-permissions.use-case';
import { GetUserDataScopeUseCase } from './application/use-cases/get-user-data-scope.use-case';
import { PERMISSION_REPOSITORY } from './domain/repositories/permission.repository.interface';
import { PrismaPermissionRepository } from './infrastructure/persistence/prisma-permission.repository';

@Module({
  providers: [
    GetUserEffectivePermissionsUseCase,
    GetUserDataScopeUseCase,
    {
      provide: PERMISSION_REPOSITORY,
      useClass: PrismaPermissionRepository,
    },
  ],
  exports: [GetUserEffectivePermissionsUseCase, GetUserDataScopeUseCase],
})
export class PermissionsModule {}
