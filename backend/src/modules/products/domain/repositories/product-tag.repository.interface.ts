export const PRODUCT_TAG_REPOSITORY = Symbol('IProductTagRepository');

export interface ProductTagSummary {
  name: string;
  productCount: number;
}

export interface IProductTagRepository {
  list(filter: { search?: string; take: number }): Promise<ProductTagSummary[]>;
}
