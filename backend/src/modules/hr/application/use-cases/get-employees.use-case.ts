import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { GetUserDataScopeUseCase } from '@modules/permissions/application/use-cases/get-user-data-scope.use-case';
import { EmployeeView } from '../../domain/entities/employee.entity';
import {
  EMPLOYEE_REPOSITORY,
  EmployeeListFilter,
  IEmployeeRepository,
} from '../../domain/repositories/employee.repository.interface';

export interface GetEmployeesInput {
  page: number;
  limit: number;
  order: 'ASC' | 'DESC';
  search?: string;
  storeId?: string;
  departmentId?: string;
  status?: string;
}

// Phạm vi dữ liệu: ALL xem hết, STORE chỉ nhân viên của cửa hàng được gán, SELF chỉ chính mình
@Injectable()
export class GetEmployeesUseCase {
  constructor(
    @Inject(EMPLOYEE_REPOSITORY) private readonly repository: IEmployeeRepository,
    private readonly getUserDataScope: GetUserDataScopeUseCase,
  ) {}

  async execute(
    userId: string,
    input: GetEmployeesInput,
  ): Promise<{ items: EmployeeView[]; total: number }> {
    const scope = await this.getUserDataScope.execute(userId);

    const filter: EmployeeListFilter = {
      skip: (input.page - 1) * input.limit,
      take: input.limit,
      order: input.order === 'ASC' ? 'asc' : 'desc',
      search: input.search?.trim() || undefined,
      departmentId: input.departmentId,
      status: input.status,
    };

    if (scope.type === 'SELF') {
      if (!scope.employeeId) return { items: [], total: 0 };
      filter.employeeId = scope.employeeId;
    } else if (scope.type === 'STORE') {
      if (input.storeId && !scope.storeIds.includes(input.storeId)) {
        throw new ForbiddenException('Bạn không được phân công làm việc tại cửa hàng này');
      }
      filter.storeIds = input.storeId ? [input.storeId] : scope.storeIds;
    } else if (input.storeId) {
      filter.storeIds = [input.storeId];
    }

    return this.repository.findAll(filter);
  }
}
