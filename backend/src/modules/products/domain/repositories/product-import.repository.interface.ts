export const PRODUCT_IMPORT_REPOSITORY = Symbol('IProductImportRepository');

export interface ImportLookupKeys {
  categorySlugs: string[];
  brandSlugs: string[];
  productSkus: string[];
  variantSkus: string[];
  barcodes: string[];
  slugs: string[];
}

export interface ExistingVariant {
  id: string;
  sku: string;
  option1Value: string | null;
  option2Value: string | null;
  option3Value: string | null;
}

export interface ExistingProduct {
  id: string;
  option1Name: string | null;
  option2Name: string | null;
  option3Name: string | null;
  variants: ExistingVariant[];
}

export interface ImportContext {
  categories: Map<string, { id: string; isActive: boolean }>;
  brands: Map<string, string>;
  products: Map<string, ExistingProduct>;
  // SKU biến thể đã có trong DB -> SKU sản phẩm sở hữu
  variantOwners: Map<string, string>;
  // Mã vạch đã có trong DB -> SKU biến thể sở hữu
  barcodeOwners: Map<string, string>;
  takenSlugs: Set<string>;
}

export interface VariantPlan {
  sku: string;
  existingId: string | null;
  option1Value: string | null;
  option2Value: string | null;
  option3Value: string | null;
  price: number;
  costPrice: number;
  weight: number | null;
  unit: string | null;
  barcode: string | null;
}

export interface ProductPlan {
  sku: string;
  existingId: string | null;
  name: string;
  slug: string;
  categoryId: string;
  brandId: string | null;
  basePrice: number;
  description: string | null;
  tags: string[] | null;
  option1Name: string | null;
  option2Name: string | null;
  option3Name: string | null;
  variants: VariantPlan[];
}

export interface IProductImportRepository {
  loadContext(keys: ImportLookupKeys): Promise<ImportContext>;
  apply(plans: ProductPlan[]): Promise<void>;
}
