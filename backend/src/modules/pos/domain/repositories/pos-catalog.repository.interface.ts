import { PosVariantStock } from '../entities/pos-lookup.entity';

export const POS_CATALOG_REPOSITORY = Symbol('IPosCatalogRepository');

export interface ExpiryWindow {
  today: Date;
  nearLimit: Date;
}

export interface IPosCatalogRepository {
  findVariantByBarcode(
    barcode: string,
    storeId: string,
    window: ExpiryWindow,
  ): Promise<PosVariantStock | null>;
  searchVariants(
    keyword: string,
    storeId: string,
    window: ExpiryWindow,
    skip: number,
    take: number,
  ): Promise<{ items: PosVariantStock[]; total: number }>;
}
