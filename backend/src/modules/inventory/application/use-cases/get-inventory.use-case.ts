import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { GetUserDataScopeUseCase } from '@modules/permissions/application/use-cases/get-user-data-scope.use-case';
import {
  isStoreInScope,
  toStoreIdsFilter,
} from '@modules/permissions/application/utils/store-scope.util';
import {
  INVENTORY_REPOSITORY,
  IInventoryRepository,
  InventoryListFilter,
  InventoryListItem,
} from '../../domain/repositories/inventory.repository.interface';

export type GetInventoryInput = Omit<InventoryListFilter, 'storeIds'> & { storeId?: string };

@Injectable()
export class GetInventoryUseCase {
  private readonly inventoryCache = new Map<
    string,
    { data: { items: InventoryListItem[]; total: number }; expiresAt: number }
  >();

  constructor(
    @Inject(INVENTORY_REPOSITORY)
    private readonly repository: IInventoryRepository,
    private readonly getUserDataScope: GetUserDataScopeUseCase,
  ) {}

  async execute(
    userId: string,
    input: GetInventoryInput,
  ): Promise<{ items: InventoryListItem[]; total: number }> {
    const cacheKey = `${userId}:${JSON.stringify(input)}`;
    const cached = this.inventoryCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    const { storeId, ...filter } = input;
    const scope = await this.getUserDataScope.execute(userId);

    if (storeId && !isStoreInScope(scope, storeId)) {
      throw new ForbiddenException('Bạn không xem được tồn kho của cửa hàng này');
    }

    const search = filter.search?.trim() || undefined;
    const result = await this.repository.findMany({
      ...filter,
      search,
      storeIds: storeId ? [storeId] : toStoreIdsFilter(scope),
    });

    this.inventoryCache.set(cacheKey, { data: result, expiresAt: Date.now() + 15000 });
    if (this.inventoryCache.size > 200) {
      const first = this.inventoryCache.keys().next().value;
      if (first) this.inventoryCache.delete(first);
    }

    return result;
  }
}
