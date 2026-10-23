import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { nearExpiryThreshold, startOfVnToday } from '@core/utils/expiry-policy.util';
import { PosVariantView } from '../../domain/entities/pos-lookup.entity';
import {
  IPosCatalogRepository,
  POS_CATALOG_REPOSITORY,
} from '../../domain/repositories/pos-catalog.repository.interface';
import { PosStoreAccessService } from '../services/pos-store-access.service';
import { toVariantView } from '../utils/sellable-quantity.util';

@Injectable()
export class ScanPosProductUseCase {
  constructor(
    @Inject(POS_CATALOG_REPOSITORY)
    private readonly repository: IPosCatalogRepository,
    private readonly storeAccess: PosStoreAccessService,
  ) {}

  async execute(userId: string, barcode: string, storeId: string): Promise<PosVariantView> {
    await this.storeAccess.assertCanSell(userId, storeId);
    const now = new Date();
    const stock = await this.repository.findVariantByBarcode(barcode, storeId, {
      today: startOfVnToday(now),
      nearLimit: nearExpiryThreshold(now),
    });
    if (!stock) {
      throw new NotFoundException('Không tìm thấy sản phẩm theo mã vạch này');
    }
    return toVariantView(stock);
  }
}
