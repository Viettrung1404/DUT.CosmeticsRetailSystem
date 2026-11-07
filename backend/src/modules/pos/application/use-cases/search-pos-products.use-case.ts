import { Inject, Injectable } from '@nestjs/common';
import { nearExpiryThreshold, startOfVnToday } from '@core/utils/expiry-policy.util';
import { PosVariantView } from '../../domain/entities/pos-lookup.entity';
import {
  IPosCatalogRepository,
  POS_CATALOG_REPOSITORY,
} from '../../domain/repositories/pos-catalog.repository.interface';
import { PosStoreAccessService } from '../services/pos-store-access.service';
import { toVariantView } from '../utils/sellable-quantity.util';

export interface SearchPosProductsInput {
  keyword: string;
  storeId: string;
  page: number;
  limit: number;
}

@Injectable()
export class SearchPosProductsUseCase {
  constructor(
    @Inject(POS_CATALOG_REPOSITORY)
    private readonly repository: IPosCatalogRepository,
    private readonly storeAccess: PosStoreAccessService,
  ) {}

  async execute(
    userId: string,
    input: SearchPosProductsInput,
  ): Promise<{ items: PosVariantView[]; total: number }> {
    await this.storeAccess.assertCanSell(userId, input.storeId);
    const now = new Date();
    const { items, total } = await this.repository.searchVariants(
      input.keyword,
      input.storeId,
      { today: startOfVnToday(now), nearLimit: nearExpiryThreshold(now) },
      (input.page - 1) * input.limit,
      input.limit,
    );
    return { items: items.map(toVariantView), total };
  }
}
