import { Module } from '@nestjs/common';
import { PermissionsModule } from '@modules/permissions/permissions.module';
import { UsersModule } from '@modules/users/users.module';
import { EmployeeAdminController } from './presentation/controllers/employee-admin.controller';
import { GetEmployeesUseCase } from './application/use-cases/get-employees.use-case';
import { CreateEmployeeUseCase } from './application/use-cases/create-employee.use-case';
import { UpdateEmployeeUseCase } from './application/use-cases/update-employee.use-case';
import { EMPLOYEE_REPOSITORY } from './domain/repositories/employee.repository.interface';
import { PrismaEmployeeRepository } from './infrastructure/persistence/prisma-employee.repository';
import { DepartmentAdminController } from './presentation/controllers/department-admin.controller';
import { ShiftAdminController } from './presentation/controllers/shift-admin.controller';
import { AttendanceAdminController } from './presentation/controllers/attendance-admin.controller';
import { GetDepartmentsUseCase } from './application/use-cases/get-departments.use-case';
import { CreateDepartmentUseCase } from './application/use-cases/create-department.use-case';
import { UpdateDepartmentUseCase } from './application/use-cases/update-department.use-case';
import { DeleteDepartmentUseCase } from './application/use-cases/delete-department.use-case';
import { GetShiftsUseCase } from './application/use-cases/get-shifts.use-case';
import { CreateShiftUseCase } from './application/use-cases/create-shift.use-case';
import { UpdateShiftUseCase } from './application/use-cases/update-shift.use-case';
import { DeleteShiftUseCase } from './application/use-cases/delete-shift.use-case';
import { CheckInUseCase } from './application/use-cases/check-in.use-case';
import { CheckOutUseCase } from './application/use-cases/check-out.use-case';
import { GetAttendanceUseCase } from './application/use-cases/get-attendance.use-case';
import { DEPARTMENT_REPOSITORY } from './domain/repositories/department.repository.interface';
import { SHIFT_REPOSITORY } from './domain/repositories/shift.repository.interface';
import { ATTENDANCE_REPOSITORY } from './domain/repositories/attendance.repository.interface';
import { PrismaDepartmentRepository } from './infrastructure/persistence/prisma-department.repository';
import { PrismaShiftRepository } from './infrastructure/persistence/prisma-shift.repository';
import { PrismaAttendanceRepository } from './infrastructure/persistence/prisma-attendance.repository';

@Module({
  imports: [UsersModule, PermissionsModule],
  controllers: [
    EmployeeAdminController,
    DepartmentAdminController,
    ShiftAdminController,
    AttendanceAdminController,
  ],
  providers: [
    GetEmployeesUseCase,
    CreateEmployeeUseCase,
    UpdateEmployeeUseCase,
    GetDepartmentsUseCase,
    CreateDepartmentUseCase,
    UpdateDepartmentUseCase,
    DeleteDepartmentUseCase,
    GetShiftsUseCase,
    CreateShiftUseCase,
    UpdateShiftUseCase,
    DeleteShiftUseCase,
    CheckInUseCase,
    CheckOutUseCase,
    GetAttendanceUseCase,
    { provide: EMPLOYEE_REPOSITORY, useClass: PrismaEmployeeRepository },
    { provide: DEPARTMENT_REPOSITORY, useClass: PrismaDepartmentRepository },
    { provide: SHIFT_REPOSITORY, useClass: PrismaShiftRepository },
    { provide: ATTENDANCE_REPOSITORY, useClass: PrismaAttendanceRepository },
  ],
})
export class HrModule {}
