import { BadRequestException, ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { GetUserDataScopeUseCase } from '@modules/permissions/application/use-cases/get-user-data-scope.use-case';
import { CommissionSummary, CommissionView } from '../../domain/entities/commission.entity';
import {
  COMMISSION_REPOSITORY,
  CommissionFilter,
  ICommissionRepository,
} from '../../domain/repositories/commission.repository.interface';

export interface GetCommissionsInput {
  page: number;
  limit: number;
  order: 'ASC' | 'DESC';
  employeeId?: string;
  storeId?: string;
  month?: number;
  year?: number;
  status?: string;
}

@Injectable()
export class GetCommissionsUseCase {
  constructor(
    @Inject(COMMISSION_REPOSITORY) private readonly repository: ICommissionRepository,
    private readonly getUserDataScope: GetUserDataScopeUseCase,
  ) {}

  async execute(
    userId: string,
    input: GetCommissionsInput,
  ): Promise<{ items: CommissionView[]; total: number; summary: CommissionSummary[] }> {
    if (input.month !== undefined && input.year === undefined) {
      throw new BadRequestException('Lọc theo tháng cần kèm năm');
    }

    const filter: CommissionFilter = {
      employeeId: input.employeeId,
      month: input.month,
      year: input.year,
      status: input.status,
    };

    const scope = await this.getUserDataScope.execute(userId);
    if (scope.type === 'SELF') {
      if (!scope.employeeId) return { items: [], total: 0, summary: [] };
      filter.employeeId = scope.employeeId;
    } else if (scope.type === 'STORE') {
      if (input.storeId && !scope.storeIds.includes(input.storeId)) {
        throw new ForbiddenException('Bạn không được phân công làm việc tại cửa hàng này');
      }
      filter.storeIds = input.storeId ? [input.storeId] : scope.storeIds;
    } else if (input.storeId) {
      filter.storeIds = [input.storeId];
    }

    const [{ items, total }, summary] = await Promise.all([
      this.repository.findAll(filter, {
        skip: (input.page - 1) * input.limit,
        take: input.limit,
        order: input.order === 'ASC' ? 'asc' : 'desc',
      }),
      this.repository.summarize(filter),
    ]);
    return { items, total, summary };
  }
}
