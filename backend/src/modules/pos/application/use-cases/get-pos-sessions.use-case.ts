import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { GetUserDataScopeUseCase } from '@modules/permissions/application/use-cases/get-user-data-scope.use-case';
import { toStoreIdsFilter } from '@modules/permissions/application/utils/store-scope.util';
import {
  IPosSessionRepository,
  POS_SESSION_REPOSITORY,
  PosSessionListFilter,
  PosSessionListOptions,
} from '../../domain/repositories/pos-session.repository.interface';
import { PosSessionEntity, PosSessionStatus } from '../../domain/entities/pos-session.entity';

export interface GetPosSessionsInput extends PosSessionListOptions {
  storeId?: string;
  cashierId?: string;
  status?: PosSessionStatus;
  fromDate?: string;
  toDate?: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const startOfVnDay = (date: string): Date => new Date(`${date}T00:00:00+07:00`);

@Injectable()
export class GetPosSessionsUseCase {
  constructor(
    @Inject(POS_SESSION_REPOSITORY)
    private readonly repository: IPosSessionRepository,
    private readonly getUserDataScope: GetUserDataScopeUseCase,
  ) {}

  async execute(
    userId: string,
    input: GetPosSessionsInput,
  ): Promise<{ items: PosSessionEntity[]; total: number }> {
    const fromDate = input.fromDate ? startOfVnDay(input.fromDate) : undefined;
    const toDate = input.toDate ? new Date(startOfVnDay(input.toDate).getTime() + DAY_MS) : undefined;
    if (fromDate && toDate && fromDate >= toDate) {
      throw new BadRequestException('Ngày bắt đầu phải trước hoặc bằng ngày kết thúc');
    }

    const scope = await this.getUserDataScope.execute(userId);
    const filter: PosSessionListFilter = {
      cashierId: input.cashierId,
      status: input.status,
      fromDate,
      toDate,
    };

    const allowedStoreIds = toStoreIdsFilter(scope);
    if (scope.type === 'SELF') {
      // Phạm vi SELF chỉ xem ca do chính mình đứng quầy
      filter.cashierId = userId;
      filter.storeIds = input.storeId ? [input.storeId] : undefined;
    } else if (allowedStoreIds) {
      filter.storeIds = input.storeId
        ? allowedStoreIds.filter((id) => id === input.storeId)
        : allowedStoreIds;
    } else {
      filter.storeIds = input.storeId ? [input.storeId] : undefined;
    }

    return this.repository.findMany(filter, {
      page: input.page,
      limit: input.limit,
      order: input.order,
    });
  }
}
