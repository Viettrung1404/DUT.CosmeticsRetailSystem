import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { CreateAdminUserUseCase } from '@modules/users/application/use-cases/create-admin-user.use-case';
import { EmployeeView } from '../../domain/entities/employee.entity';
import {
  EMPLOYEE_REPOSITORY,
  IEmployeeRepository,
} from '../../domain/repositories/employee.repository.interface';

export interface CreateEmployeeInput {
  email: string;
  fullName: string;
  phone?: string | null;
  roleId: number;
  position: string;
  hireDate: Date;
  employeeCode?: string;
  departmentId?: string | null;
  storeId?: string | null;
  salary?: number | null;
  commissionRate?: number;
}

export interface CreateEmployeeResult {
  employee: EmployeeView;
  activationEmailSent: boolean;
}

// Mã nhân viên tự sinh NV001, NV002... khi không gửi (H9)
@Injectable()
export class CreateEmployeeUseCase {
  constructor(
    @Inject(EMPLOYEE_REPOSITORY) private readonly repository: IEmployeeRepository,
    private readonly createAdminUser: CreateAdminUserUseCase,
  ) {}

  async execute(input: CreateEmployeeInput): Promise<CreateEmployeeResult> {
    if (input.departmentId && !(await this.repository.departmentExists(input.departmentId))) {
      throw new BadRequestException('Phòng ban không tồn tại');
    }

    const employeeCode =
      input.employeeCode?.trim().toUpperCase() ||
      `NV${String((await this.repository.findMaxEmployeeNumber()) + 1).padStart(3, '0')}`;

    const { user, activationEmailSent } = await this.createAdminUser.execute({
      email: input.email,
      fullName: input.fullName,
      phone: input.phone,
      roleId: input.roleId,
      employee: {
        employeeCode,
        position: input.position.trim(),
        hireDate: input.hireDate,
        departmentId: input.departmentId ?? null,
        storeId: input.storeId ?? null,
        salary: input.salary ?? null,
        commissionRate: input.commissionRate ?? 0,
      },
    });

    const employee = (await this.repository.findByUserId(user.id)) as EmployeeView;
    return { employee, activationEmailSent };
  }
}
