export interface VariantDetail {
  id: string;
  productName: string;
  option1Value?: string | null;
  option2Value?: string | null;
  option3Value?: string | null;
  unitPrice: number;
  unitCost: number;
  sku?: string | null;
}

export const VARIANT_CATALOG_PROVIDER = 'VARIANT_CATALOG_PROVIDER';

export interface IVariantCatalogProvider {
  getVariantsDetails(variantIds: string[]): Promise<VariantDetail[]>;
}
