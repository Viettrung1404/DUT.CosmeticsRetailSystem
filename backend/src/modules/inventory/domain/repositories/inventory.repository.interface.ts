export const INVENTORY_REPOSITORY = Symbol('IInventoryRepository');

export type InventoryStockStatus = 'LOW_STOCK' | 'OUT_OF_STOCK' | 'IN_STOCK';

export interface StoreInfo {
  id: string;
  code: string;
  name: string;
  type: string;
  isActive: boolean;
}

export interface InventoryListItem {
  id: string;
  store: { id: string; code: string; name: string };
  variant: {
    id: string;
    sku: string;
    barcode: string | null;
    optionLabel: string | null;
    productId: string;
    productName: string;
  };
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  minQuantity: number;
  nearestExpiryDate: Date | null;
  updatedAt: Date;
}

export interface InventoryListFilter {
  storeIds?: string[];
  categoryId?: string;
  brandId?: string;
  search?: string;
  status?: InventoryStockStatus;
  page: number;
  limit: number;
}

export interface PurchaseOrderSnapshot {
  id: string;
  poNumber: string;
  status: string;
  storeId: string;
  storeType: string;
  supplierId: string;
  items: {
    id: string;
    productVariantId: string;
    quantityOrdered: number;
    quantityReceived: number;
    unitCost: number;
  }[];
}

export interface ReceiptLine {
  purchaseOrderItemId: string;
  productVariantId: string;
  quantity: number;
  unitCost: number;
  batchNumber: string;
  expiryDate: Date;
  manufactureDate: Date | null;
}

export interface ReceiptCommand {
  purchaseOrderId: string;
  storeId: string;
  supplierId: string;
  lines: ReceiptLine[];
  note: string | null;
  receivedBy: string;
  receivedDate: Date;
}

export type ReceiptResult =
  | { ok: true; poStatus: string; batchIds: string[] }
  | { ok: false; reason: 'STATUS_CHANGED' | 'OVER_RECEIVED' }
  | { ok: false; reason: 'BATCH_EXPIRY_MISMATCH'; batchNumber: string };

export interface IInventoryRepository {
  findStore(storeId: string): Promise<StoreInfo | null>;
  variantExists(productVariantId: string): Promise<boolean>;
  findMany(filter: InventoryListFilter): Promise<{ items: InventoryListItem[]; total: number }>;
  findPurchaseOrder(id: string): Promise<PurchaseOrderSnapshot | null>;
  // Khóa phiếu nhập trong transaction rồi kiểm lại số đã nhận, tránh hai người nhận cùng một phiếu
  applyReceipt(command: ReceiptCommand): Promise<ReceiptResult>;
  findInventoryRow(id: string): Promise<{ id: string; storeId: string; maxQuantity: number | null } | null>;
  updateThresholds(
    id: string,
    minQuantity: number,
    maxQuantity: number | null,
  ): Promise<{ id: string; minQuantity: number; maxQuantity: number | null }>;
}
