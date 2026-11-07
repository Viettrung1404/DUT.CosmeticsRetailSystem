import { ForbiddenException, Injectable } from '@nestjs/common';
import {
  isStoreInScope,
  toStoreIdsFilter,
} from '@modules/permissions/application/utils/store-scope.util';
import { TransferView } from '../../domain/repositories/transfer.repository.interface';
import { TransferAccessService } from '../services/transfer-access.service';

@Injectable()
export class GetTransfersUseCase {
  constructor(private readonly access: TransferAccessService) {}

  async execute(
    userId: string,
    input: { page: number; limit: number; storeId?: string; status?: string },
  ): Promise<{ items: TransferView[]; total: number }> {
    const scope = await this.access.scopeOf(userId);
    if (input.storeId && !isStoreInScope(scope, input.storeId)) {
      throw new ForbiddenException('Địa điểm ngoài phạm vi của bạn');
    }
    return this.access.repository.findMany({
      skip: (input.page - 1) * input.limit,
      take: input.limit,
      storeIds: input.storeId ? [input.storeId] : toStoreIdsFilter(scope),
      status: input.status,
    });
  }

  detail(userId: string, id: string): Promise<TransferView> {
    return this.access.load(userId, id, 'EITHER');
  }
}
