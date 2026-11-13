import { ApiProperty } from '@nestjs/swagger';

export class SupplierResponseDto {
  @ApiProperty({ example: 'e1f2a3b4-0000-4000-8000-000000000021' })
  id: string;

  @ApiProperty({ example: 'Công ty TNHH Mỹ phẩm Hàn Việt' })
  name: string;

  @ApiProperty({ example: 'Lê Thị C', nullable: true, type: String })
  contactPerson: string | null;

  @ApiProperty({ example: 'contact@hanviet.example', nullable: true, type: String })
  email: string | null;

  @ApiProperty({ example: '0236 3000 111', nullable: true, type: String })
  phone: string | null;

  @ApiProperty({ example: '12 Nguyễn Văn Linh, Đà Nẵng', nullable: true, type: String })
  address: string | null;

  @ApiProperty({ example: '0401234567', nullable: true, type: String })
  taxCode: string | null;

  @ApiProperty({ example: 'Công nợ 30 ngày', nullable: true, type: String })
  paymentTerms: string | null;

  @ApiProperty({ example: 4.5, nullable: true, type: Number })
  rating: number | null;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt: Date;
}

export class SupplierBalanceResponseDto {
  @ApiProperty({ example: 'e1f2a3b4-0000-4000-8000-000000000021' })
  supplierId: string;

  @ApiProperty({ example: 52000000, description: 'Tổng tiền hàng đã nhận (VND)' })
  totalReceived: number;

  @ApiProperty({ example: 30000000, description: 'Tổng tiền đã thanh toán (VND)' })
  totalPaid: number;

  @ApiProperty({ example: 22000000, description: 'Số còn nợ (VND)' })
  balance: number;

  @ApiProperty({ example: 1, description: 'Số phiếu nhập chưa có hóa đơn (tạm tính theo giá PO)' })
  receiptsWithoutInvoice: number;
}

export class SupplierPaymentResponseDto {
  @ApiProperty({ example: 'e1f2a3b4-0000-4000-8000-000000000022' })
  id: string;

  @ApiProperty({ example: 'e1f2a3b4-0000-4000-8000-000000000021' })
  supplierId: string;

  @ApiProperty({ example: 'Công ty TNHH Mỹ phẩm Hàn Việt' })
  supplierName: string;

  @ApiProperty({ example: null, nullable: true, type: String })
  purchaseOrderId: string | null;

  @ApiProperty({ example: 'PO-202611-0005', nullable: true, type: String })
  poNumber: string | null;

  @ApiProperty({ example: 15000000 })
  amount: number;

  @ApiProperty({ example: 'BANK_TRANSFER' })
  paymentMethod: string;

  @ApiProperty({ type: String, format: 'date-time' })
  paymentDate: Date;

  @ApiProperty({ example: 'COMPLETED' })
  status: string;

  @ApiProperty({ example: null, nullable: true, type: String })
  note: string | null;

  @ApiProperty({ example: 'Nguyễn Văn A', nullable: true, type: String })
  createdByName: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: Date;
}

export class PurchaseOrderItemResponseDto {
  @ApiProperty({ example: 'e1f2a3b4-0000-4000-8000-000000000023' })
  id: string;

  @ApiProperty({ example: 'd1e2f3a4-0000-4000-8000-000000000011' })
  productVariantId: string;

  @ApiProperty({ example: 'LANEIGE-WM-01' })
  sku: string;

  @ApiProperty({ example: 'Laneige Water Bank Essence' })
  productName: string;

  @ApiProperty({ example: 50 })
  quantityOrdered: number;

  @ApiProperty({ example: 0 })
  quantityReceived: number;

  @ApiProperty({ example: 120000, description: 'Giá nhập một đơn vị (VND)' })
  unitCost: number;

  @ApiProperty({ example: 6000000, description: 'Thành tiền dòng (VND)' })
  totalCost: number;
}

export class GoodsReceiptResponseDto {
  @ApiProperty({ example: 'e1f2a3b4-0000-4000-8000-000000000024' })
  id: string;

  @ApiProperty({ example: 'PN-202611-0009' })
  receiptCode: string;

  @ApiProperty({ type: String, format: 'date-time' })
  receivedDate: Date;

  @ApiProperty({ example: 'Shipper Giao Nhanh', nullable: true, type: String })
  deliveredBy: string | null;

  @ApiProperty({ example: 'Phạm Văn D', nullable: true, type: String })
  receivedByName: string | null;

  @ApiProperty({ example: 6000000 })
  totalCost: number;

  @ApiProperty({ example: 'HD-0001234', nullable: true, type: String })
  invoiceNumber: string | null;

  @ApiProperty({ example: null, nullable: true, type: String, format: 'date-time' })
  invoiceDate: Date | null;

  @ApiProperty({ example: null, nullable: true, type: Number })
  invoiceAmount: number | null;
}

export class PurchaseOrderResponseDto {
  @ApiProperty({ example: 'e1f2a3b4-0000-4000-8000-000000000025' })
  id: string;

  @ApiProperty({ example: 'PO-202611-0005' })
  poNumber: string;

  @ApiProperty({ example: 'e1f2a3b4-0000-4000-8000-000000000021' })
  supplierId: string;

  @ApiProperty({ example: 'Công ty TNHH Mỹ phẩm Hàn Việt' })
  supplierName: string;

  @ApiProperty({ example: 'c0ffee00-0000-4000-8000-000000000004' })
  storeId: string;

  @ApiProperty({ example: 'Kho tổng Hà Nội' })
  storeName: string;

  @ApiProperty({ example: 'DRAFT', description: 'DRAFT | SENT | CONFIRMED | PARTIALLY_RECEIVED | RECEIVED | CANCELLED' })
  status: string;

  @ApiProperty({ example: 6000000 })
  totalAmount: number;

  @ApiProperty({ example: null, nullable: true, type: String })
  note: string | null;

  @ApiProperty({ example: '2026-11-20T00:00:00.000Z', nullable: true, type: String, format: 'date-time' })
  expectedDate: Date | null;

  @ApiProperty({ example: null, nullable: true, type: String, format: 'date-time' })
  receivedDate: Date | null;

  @ApiProperty({ example: null, nullable: true, type: String })
  createdBy: string | null;

  @ApiProperty({ example: 'Nguyễn Văn A', nullable: true, type: String })
  createdByName: string | null;

  @ApiProperty({ example: null, nullable: true, type: String })
  approvedBy: string | null;

  @ApiProperty({ example: null, nullable: true, type: String })
  approvedByName: string | null;

  @ApiProperty({ example: null, nullable: true, type: String, format: 'date-time' })
  approvedAt: Date | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: Date;

  @ApiProperty({ type: [PurchaseOrderItemResponseDto] })
  items: PurchaseOrderItemResponseDto[];

  @ApiProperty({ type: [GoodsReceiptResponseDto] })
  receipts: GoodsReceiptResponseDto[];
}
