import { BadRequestException, ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { GetUserDataScopeUseCase } from '@modules/permissions/application/use-cases/get-user-data-scope.use-case';
import { AttendanceView } from '../../domain/entities/attendance.entity';
import {
  ATTENDANCE_REPOSITORY,
  AttendanceListFilter,
  IAttendanceRepository,
} from '../../domain/repositories/attendance.repository.interface';
import { parseDateOnly } from '../utils/vn-time.util';

export interface GetAttendanceInput {
  page: number;
  limit: number;
  order: 'ASC' | 'DESC';
  employeeId?: string;
  storeId?: string;
  from?: string;
  to?: string;
  status?: string;
}

@Injectable()
export class GetAttendanceUseCase {
  constructor(
    @Inject(ATTENDANCE_REPOSITORY) private readonly repository: IAttendanceRepository,
    private readonly getUserDataScope: GetUserDataScopeUseCase,
  ) {}

  async execute(
    userId: string,
    input: GetAttendanceInput,
  ): Promise<{ items: AttendanceView[]; total: number }> {
    const from = input.from ? parseDateOnly(input.from) : undefined;
    const to = input.to ? parseDateOnly(input.to) : undefined;
    if (from && to && from > to) {
      throw new BadRequestException('Ngày bắt đầu phải trước hoặc bằng ngày kết thúc');
    }

    const filter: AttendanceListFilter = {
      skip: (input.page - 1) * input.limit,
      take: input.limit,
      order: input.order === 'ASC' ? 'asc' : 'desc',
      employeeId: input.employeeId,
      from,
      to,
      status: input.status,
    };

    const scope = await this.getUserDataScope.execute(userId);
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

  async executeSelf(
    userId: string,
    input: Omit<GetAttendanceInput, 'employeeId' | 'storeId'>,
  ): Promise<{ items: AttendanceView[]; total: number }> {
    const employee = await this.repository.findEmployeeByUserId(userId);
    if (!employee) throw new ForbiddenException('Tài khoản này không có hồ sơ nhân viên');

    const from = input.from ? parseDateOnly(input.from) : undefined;
    const to = input.to ? parseDateOnly(input.to) : undefined;
    if (from && to && from > to) {
      throw new BadRequestException('Ngày bắt đầu phải trước hoặc bằng ngày kết thúc');
    }
    return this.repository.findAll({
      skip: (input.page - 1) * input.limit,
      take: input.limit,
      order: input.order === 'ASC' ? 'asc' : 'desc',
      employeeId: employee.id,
      from,
      to,
      status: input.status,
    });
  }
}
