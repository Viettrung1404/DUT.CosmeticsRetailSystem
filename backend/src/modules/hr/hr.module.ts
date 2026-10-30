import { Module } from '@nestjs/common';
import { PermissionsModule } from '@modules/permissions/permissions.module';
import { UsersModule } from '@modules/users/users.module';
import { EmployeeAdminController } from './presentation/controllers/employee-admin.controller';
import { GetEmployeesUseCase } from './application/use-cases/get-employees.use-case';
import { CreateEmployeeUseCase } from './application/use-cases/create-employee.use-case';
import { UpdateEmployeeUseCase } from './application/use-cases/update-employee.use-case';
import { EMPLOYEE_REPOSITORY } from './domain/repositories/employee.repository.interface';
import { PrismaEmployeeRepository } from './infrastructure/persistence/prisma-employee.repository';

@Module({
  imports: [UsersModule, PermissionsModule],
  controllers: [EmployeeAdminController],
  providers: [
    GetEmployeesUseCase,
    CreateEmployeeUseCase,
    UpdateEmployeeUseCase,
    { provide: EMPLOYEE_REPOSITORY, useClass: PrismaEmployeeRepository },
  ],
})
export class HrModule {}
