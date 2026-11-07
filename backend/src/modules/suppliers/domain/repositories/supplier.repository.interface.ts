export const SUPPLIER_REPOSITORY = Symbol('ISupplierRepository');

export interface SupplierView {
  id: string;
  name: string;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  taxCode: string | null;
  paymentTerms: string | null;
  rating: number | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SupplierData {
  name?: string;
  contactPerson?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  taxCode?: string | null;
  paymentTerms?: string | null;
  isActive?: boolean;
}

export interface SupplierBalance {
  supplierId: string;
  // Σ tiền hóa đơn trên phiếu nhập; phiếu chưa có hóa đơn tạm tính giá PO × SL nhận
  totalReceived: number;
  totalPaid: number;
  balance: number;
  receiptsWithoutInvoice: number;
}

export interface SupplierPaymentView {
  id: string;
  supplierId: string;
  supplierName: string;
  purchaseOrderId: string | null;
  poNumber: string | null;
  amount: number;
  paymentMethod: string;
  paymentDate: Date;
  status: string;
  note: string | null;
  createdBy: string | null;
  createdByName: string | null;
  createdAt: Date;
}

export interface ISupplierRepository {
  findMany(filter: {
    skip: number;
    take: number;
    search?: string;
    isActive?: boolean;
  }): Promise<{ items: SupplierView[]; total: number }>;
  findById(id: string): Promise<SupplierView | null>;
  findByTaxCode(taxCode: string): Promise<{ id: string } | null>;
  create(data: SupplierData & { name: string }): Promise<SupplierView>;
  update(id: string, data: SupplierData): Promise<SupplierView>;
  setRating(id: string, rating: number, actorId: string): Promise<SupplierView>;
  balance(id: string): Promise<SupplierBalance>;
  // Khóa theo NCC rồi kiểm lại số nợ, tránh hai kế toán cùng trả vượt nợ
  createPayment(data: {
    supplierId: string;
    purchaseOrderId: string | null;
    amount: number;
    paymentMethod: string;
    paymentDate: Date;
    note: string | null;
    createdBy: string;
  }): Promise<{ ok: true; payment: SupplierPaymentView } | { ok: false; balance: number }>;
  findPayments(filter: {
    skip: number;
    take: number;
    supplierId?: string;
  }): Promise<{ items: SupplierPaymentView[]; total: number }>;
  purchaseOrderSupplier(purchaseOrderId: string): Promise<string | null>;
}
