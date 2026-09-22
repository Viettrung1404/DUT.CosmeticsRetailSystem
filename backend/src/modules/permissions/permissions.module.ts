import { Module } from '@nestjs/common';
import { GetUserEffectivePermissionsUseCase } from './application/use-cases/get-user-effective-permissions.use-case';
import { PERMISSION_REPOSITORY } from './domain/repositories/permission.repository.interface';
import { PrismaPermissionRepository } from './infrastructure/persistence/prisma-permission.repository';

@Module({
  providers: [
    GetUserEffectivePermissionsUseCase,
    {
      provide: PERMISSION_REPOSITORY,
      useClass: PrismaPermissionRepository,
    },
  ],
  exports: [GetUserEffectivePermissionsUseCase],
})
export class PermissionsModule {}
