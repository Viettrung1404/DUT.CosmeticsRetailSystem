import { Inject, Injectable } from '@nestjs/common';
import { GetUserDataScopeUseCase } from '@modules/permissions/application/use-cases/get-user-data-scope.use-case';
import { PosSellingStore } from '../../domain/entities/pos-lookup.entity';
import {
  IPosCatalogRepository,
  POS_CATALOG_REPOSITORY,
} from '../../domain/repositories/pos-catalog.repository.interface';

@Injectable()
export class GetPosMyStoresUseCase {
  constructor(
    @Inject(POS_CATALOG_REPOSITORY)
    private readonly repository: IPosCatalogRepository,
    private readonly getUserDataScope: GetUserDataScopeUseCase,
  ) {}

  async execute(userId: string): Promise<PosSellingStore[]> {
    const scope = await this.getUserDataScope.execute(userId);
    if (scope.storeIds.length === 0) {
      return [];
    }
    return this.repository.findSellingStores(scope.storeIds);
  }
}
