import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { GetUserDataScopeUseCase } from '@modules/permissions/application/use-cases/get-user-data-scope.use-case';
import {
  isStoreInScope,
  toStoreIdsFilter,
} from '@modules/permissions/application/utils/store-scope.util';
import { ShiftView } from '../../domain/entities/shift.entity';
import { IShiftRepository, SHIFT_REPOSITORY } from '../../domain/repositories/shift.repository.interface';

@Injectable()
export class GetShiftsUseCase {
  constructor(
    @Inject(SHIFT_REPOSITORY) private readonly repository: IShiftRepository,
    private readonly getUserDataScope: GetUserDataScopeUseCase,
  ) {}

  async execute(userId: string, storeId?: string): Promise<ShiftView[]> {
    const scope = await this.getUserDataScope.execute(userId);
    if (storeId && !isStoreInScope(scope, storeId)) {
      throw new ForbiddenException('Bạn không được phân công làm việc tại cửa hàng này');
    }
    return this.repository.findAll({ storeIds: toStoreIdsFilter(scope), storeId });
  }
}
