export const BATCH_REPOSITORY = Symbol('IBatchRepository');

export interface BatchView {
  id: string;
  storeId: string;
  storeName: string;
  productVariantId: string;
  sku: string;
  productName: string;
  batchNumber: string;
  quantity: number;
  manufactureDate: Date | null;
  expiryDate: Date;
  isActive: boolean;
}

export interface BatchListFilter {
  skip: number;
  take: number;
  storeIds?: string[];
  productVariantId?: string;
  search?: string;
  expiryFrom?: Date;
  expiryBefore?: Date;
  isActive?: boolean;
  includeEmpty: boolean;
}

export interface IBatchRepository {
  findMany(filter: BatchListFilter): Promise<{ items: BatchView[]; total: number }>;
  findById(id: string): Promise<BatchView | null>;
  setActive(id: string, isActive: boolean, actorId: string, reason: string | null): Promise<BatchView>;
}
