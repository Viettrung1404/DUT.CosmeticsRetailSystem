export const PURCHASE_ORDER_REPOSITORY = Symbol('IPurchaseOrderRepository');

export const PO_STATUSES = [
  'DRAFT',
  'SENT',
  'CONFIRMED',
  'PARTIALLY_RECEIVED',
  'RECEIVED',
  'CANCELLED',
] as const;

export interface PurchaseOrderLine {
  productVariantId: string;
  quantity: number;
  unitCost: number;
}

export interface GoodsReceiptView {
  id: string;
  receiptCode: string;
  receivedDate: Date;
  deliveredBy: string | null;
  receivedByName: string | null;
  totalCost: number;
  invoiceNumber: string | null;
  invoiceDate: Date | null;
  invoiceAmount: number | null;
}

export interface PurchaseOrderView {
  id: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  storeId: string;
  storeName: string;
  status: string;
  totalAmount: number;
  note: string | null;
  expectedDate: Date | null;
  receivedDate: Date | null;
  createdBy: string | null;
  createdByName: string | null;
  approvedBy: string | null;
  approvedByName: string | null;
  approvedAt: Date | null;
  createdAt: Date;
  items: {
    id: string;
    productVariantId: string;
    sku: string;
    productName: string;
    quantityOrdered: number;
    quantityReceived: number;
    unitCost: number;
    totalCost: number;
  }[];
  receipts: GoodsReceiptView[];
}

export interface IPurchaseOrderRepository {
  findStore(id: string): Promise<{ id: string; type: string; isActive: boolean } | null>;
  findSupplier(id: string): Promise<{ id: string; isActive: boolean } | null>;
  findMissingVariants(ids: string[]): Promise<string[]>;
  create(data: {
    supplierId: string;
    storeId: string;
    note: string | null;
    expectedDate: Date | null;
    createdBy: string;
    items: PurchaseOrderLine[];
  }): Promise<string>;
  replaceDraft(
    id: string,
    data: { note?: string | null; expectedDate?: Date | null; items?: PurchaseOrderLine[] },
  ): Promise<boolean>;
  // Đổi trạng thái có điều kiện; hủy chỉ khi chưa nhận dòng nào
  changeStatus(
    id: string,
    from: string[],
    to: string,
    data?: { approvedBy?: string; requireNothingReceived?: boolean },
  ): Promise<boolean>;
  findById(id: string): Promise<PurchaseOrderView | null>;
  findMany(filter: {
    skip: number;
    take: number;
    storeIds?: string[];
    supplierId?: string;
    status?: string;
    search?: string;
  }): Promise<{ items: PurchaseOrderView[]; total: number }>;
}
