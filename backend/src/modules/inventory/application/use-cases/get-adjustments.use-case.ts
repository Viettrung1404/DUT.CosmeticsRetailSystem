import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { GetUserDataScopeUseCase } from '@modules/permissions/application/use-cases/get-user-data-scope.use-case';
import {
  isStoreInScope,
  toStoreIdsFilter,
} from '@modules/permissions/application/utils/store-scope.util';
import {
  ADJUSTMENT_REPOSITORY,
  AdjustmentView,
  IAdjustmentRepository,
} from '../../domain/repositories/adjustment.repository.interface';

@Injectable()
export class GetAdjustmentsUseCase {
  constructor(
    @Inject(ADJUSTMENT_REPOSITORY) private readonly repository: IAdjustmentRepository,
    private readonly getUserDataScope: GetUserDataScopeUseCase,
  ) {}

  async execute(
    userId: string,
    input: { page: number; limit: number; storeId?: string; status?: string },
  ): Promise<{ items: AdjustmentView[]; total: number }> {
    const scope = await this.getUserDataScope.execute(userId);
    if (input.storeId && !isStoreInScope(scope, input.storeId)) {
      throw new ForbiddenException('Địa điểm ngoài phạm vi của bạn');
    }
    return this.repository.findMany({
      skip: (input.page - 1) * input.limit,
      take: input.limit,
      storeIds: input.storeId ? [input.storeId] : toStoreIdsFilter(scope),
      status: input.status,
    });
  }

  async detail(userId: string, id: string): Promise<AdjustmentView> {
    const adjustment = await this.repository.findById(id);
    if (!adjustment) throw new NotFoundException('Không tìm thấy phiếu điều chỉnh');
    const scope = await this.getUserDataScope.execute(userId);
    if (!isStoreInScope(scope, adjustment.storeId)) {
      throw new ForbiddenException('Phiếu thuộc địa điểm ngoài phạm vi của bạn');
    }
    return adjustment;
  }
}
