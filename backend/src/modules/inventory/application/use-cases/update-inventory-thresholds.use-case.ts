import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { GetUserDataScopeUseCase } from '@modules/permissions/application/use-cases/get-user-data-scope.use-case';
import { isStoreInScope } from '@modules/permissions/application/utils/store-scope.util';
import {
  INVENTORY_REPOSITORY,
  IInventoryRepository,
} from '../../domain/repositories/inventory.repository.interface';

@Injectable()
export class UpdateInventoryThresholdsUseCase {
  constructor(
    @Inject(INVENTORY_REPOSITORY) private readonly repository: IInventoryRepository,
    private readonly getUserDataScope: GetUserDataScopeUseCase,
  ) {}

  async execute(
    userId: string,
    id: string,
    input: { minQuantity: number; maxQuantity?: number | null },
  ) {
    const row = await this.repository.findInventoryRow(id);
    if (!row) throw new NotFoundException('Không tìm thấy dòng tồn kho');
    const scope = await this.getUserDataScope.execute(userId);
    if (!isStoreInScope(scope, row.storeId)) {
      throw new ForbiddenException('Bạn không cấu hình được tồn kho của địa điểm này');
    }
    const max = input.maxQuantity === undefined ? row.maxQuantity : input.maxQuantity;
    if (max !== null && input.minQuantity > max) {
      throw new BadRequestException('Mức tồn tối thiểu không được lớn hơn mức tối đa');
    }
    return this.repository.updateThresholds(id, input.minQuantity, max);
  }
}
