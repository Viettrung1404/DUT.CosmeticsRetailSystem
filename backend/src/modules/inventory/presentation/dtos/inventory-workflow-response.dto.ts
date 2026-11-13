import { ApiProperty } from '@nestjs/swagger';

export class BatchResponseDto {
  @ApiProperty({ example: 'd1e2f3a4-0000-4000-8000-000000000010' })
  id: string;

  @ApiProperty({ example: 'c0ffee00-0000-4000-8000-000000000003' })
  storeId: string;

  @ApiProperty({ example: 'CH01 - Quận Hải Châu' })
  storeName: string;

  @ApiProperty({ example: 'd1e2f3a4-0000-4000-8000-000000000011' })
  productVariantId: string;

  @ApiProperty({ example: 'LANEIGE-WM-01' })
  sku: string;

  @ApiProperty({ example: 'Laneige Water Bank Essence' })
  productName: string;

  @ApiProperty({ example: 'LOT-2026-0412' })
  batchNumber: string;

  @ApiProperty({ example: 40 })
  quantity: number;

  @ApiProperty({ example: '2026-04-01T00:00:00.000Z', nullable: true, type: String, format: 'date-time' })
  manufactureDate: Date | null;

  @ApiProperty({ example: '2027-04-01T00:00:00.000Z', type: String, format: 'date-time' })
  expiryDate: Date;

  @ApiProperty({ example: true })
  isActive: boolean;
}

export class BatchListItemResponseDto extends BatchResponseDto {
  @ApiProperty({ example: 'NEAR_EXPIRY', description: 'Trạng thái hạn dùng (theo ngưỡng cận date)' })
  expiryStatus: string;

  @ApiProperty({ example: 140 })
  daysToExpiry: number;
}

export class AdjustmentItemResponseDto {
  @ApiProperty({ example: 'd1e2f3a4-0000-4000-8000-000000000012' })
  id: string;

  @ApiProperty({ example: 'd1e2f3a4-0000-4000-8000-000000000011' })
  productVariantId: string;

  @ApiProperty({ example: 'LANEIGE-WM-01' })
  sku: string;

  @ApiProperty({ example: 'Laneige Water Bank Essence' })
  productName: string;

  @ApiProperty({ example: null, nullable: true, type: String })
  batchId: string | null;

  @ApiProperty({ example: 'LOT-2026-0412', nullable: true, type: String })
  batchNumber: string | null;

  @ApiProperty({ example: '2027-04-01T00:00:00.000Z', nullable: true, type: String, format: 'date-time' })
  expiryDate: Date | null;

  @ApiProperty({ example: -2, description: 'Số lượng điều chỉnh (âm là giảm tồn)' })
  quantity: number;
}

export class AdjustmentResponseDto {
  @ApiProperty({ example: 'd1e2f3a4-0000-4000-8000-000000000013' })
  id: string;

  @ApiProperty({ example: 'ADJ-CH01-202611-0003' })
  adjustmentCode: string;

  @ApiProperty({ example: 'c0ffee00-0000-4000-8000-000000000003' })
  storeId: string;

  @ApiProperty({ example: 'CH01 - Quận Hải Châu' })
  storeName: string;

  @ApiProperty({ example: 'PENDING', description: 'Trạng thái phiếu điều chỉnh (ví dụ PENDING khi chờ duyệt)' })
  status: string;

  @ApiProperty({ example: 'Hàng vỡ khi kiểm kê' })
  reason: string;

  @ApiProperty({ example: null, nullable: true, type: String })
  reviewNote: string | null;

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

  @ApiProperty({ type: [AdjustmentItemResponseDto] })
  items: AdjustmentItemResponseDto[];
}

export class TransferItemResponseDto {
  @ApiProperty({ example: 'd1e2f3a4-0000-4000-8000-000000000014' })
  id: string;

  @ApiProperty({ example: 'd1e2f3a4-0000-4000-8000-000000000011' })
  productVariantId: string;

  @ApiProperty({ example: 'LANEIGE-WM-01' })
  sku: string;

  @ApiProperty({ example: 'Laneige Water Bank Essence' })
  productName: string;

  @ApiProperty({ example: null, nullable: true, type: String })
  batchId: string | null;

  @ApiProperty({ example: 'LOT-2026-0412', nullable: true, type: String })
  batchNumber: string | null;

  @ApiProperty({ example: '2027-04-01T00:00:00.000Z', nullable: true, type: String, format: 'date-time' })
  expiryDate: Date | null;

  @ApiProperty({ example: 10 })
  quantityRequested: number;

  @ApiProperty({ example: 8, nullable: true, type: Number })
  quantityApproved: number | null;

  @ApiProperty({ example: 8 })
  quantityShipped: number;

  @ApiProperty({ example: 7 })
  quantityReceived: number;

  @ApiProperty({ example: 1 })
  lossQuantity: number;

  @ApiProperty({ example: 'Vỡ trong quá trình vận chuyển', nullable: true, type: String })
  lossReason: string | null;
}

export class TransferResponseDto {
  @ApiProperty({ example: 'd1e2f3a4-0000-4000-8000-000000000015' })
  id: string;

  @ApiProperty({ example: 'TRF-202611-0007' })
  transferCode: string;

  @ApiProperty({ example: 'c0ffee00-0000-4000-8000-000000000004' })
  fromStoreId: string;

  @ApiProperty({ example: 'Kho tổng Hà Nội' })
  fromStoreName: string;

  @ApiProperty({ example: 'c0ffee00-0000-4000-8000-000000000003' })
  toStoreId: string;

  @ApiProperty({ example: 'CH01 - Quận Hải Châu' })
  toStoreName: string;

  @ApiProperty({ example: 'REQUESTED', description: 'Trạng thái phiếu chuyển kho (ví dụ REQUESTED)' })
  status: string;

  @ApiProperty({ example: null, nullable: true, type: String })
  note: string | null;

  @ApiProperty({ example: null, nullable: true, type: String })
  requestedBy: string | null;

  @ApiProperty({ example: 'Trần Thị B', nullable: true, type: String })
  requestedByName: string | null;

  @ApiProperty({ example: null, nullable: true, type: String })
  approvedBy: string | null;

  @ApiProperty({ example: null, nullable: true, type: String })
  shippedBy: string | null;

  @ApiProperty({ example: null, nullable: true, type: String })
  receivedBy: string | null;

  @ApiProperty({ example: null, nullable: true, type: String, format: 'date-time' })
  shippedAt: Date | null;

  @ApiProperty({ example: null, nullable: true, type: String, format: 'date-time' })
  receivedAt: Date | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: Date;

  @ApiProperty({ type: [TransferItemResponseDto] })
  items: TransferItemResponseDto[];
}

export class StocktakeItemResponseDto {
  @ApiProperty({ example: 'd1e2f3a4-0000-4000-8000-000000000016' })
  id: string;

  @ApiProperty({ example: 'd1e2f3a4-0000-4000-8000-000000000011' })
  productVariantId: string;

  @ApiProperty({ example: 'LANEIGE-WM-01' })
  sku: string;

  @ApiProperty({ example: 'Laneige Water Bank Essence' })
  productName: string;

  @ApiProperty({ example: null, nullable: true, type: String })
  batchId: string | null;

  @ApiProperty({ example: 'LOT-2026-0412', nullable: true, type: String })
  batchNumber: string | null;

  @ApiProperty({ example: 40 })
  systemQuantity: number;

  @ApiProperty({ example: 38 })
  actualQuantity: number;

  @ApiProperty({ example: -2 })
  varianceQuantity: number;

  @ApiProperty({ example: 185000, description: 'Giá vốn một đơn vị (VND)' })
  unitCost: number;

  @ApiProperty({ example: 'Đếm thiếu', nullable: true, type: String })
  varianceReason: string | null;

  @ApiProperty({ example: null, nullable: true, type: String })
  note: string | null;
}

export class StocktakeResponseDto {
  @ApiProperty({ example: 'd1e2f3a4-0000-4000-8000-000000000017' })
  id: string;

  @ApiProperty({ example: 'KK-CH01-202611-0002' })
  stocktakeCode: string;

  @ApiProperty({ example: 'c0ffee00-0000-4000-8000-000000000003' })
  storeId: string;

  @ApiProperty({ example: 'CH01 - Quận Hải Châu' })
  storeName: string;

  @ApiProperty({ example: 'COUNTING', description: 'Trạng thái phiếu kiểm kê' })
  status: string;

  @ApiProperty({ example: -370000, description: 'Tổng giá trị chênh lệch (VND)' })
  totalVarianceValue: number;

  @ApiProperty({ example: null, nullable: true, type: String })
  note: string | null;

  @ApiProperty({ example: null, nullable: true, type: String })
  createdBy: string | null;

  @ApiProperty({ example: 'Nguyễn Văn A', nullable: true, type: String })
  createdByName: string | null;

  @ApiProperty({ example: null, nullable: true, type: String })
  completedBy: string | null;

  @ApiProperty({ example: null, nullable: true, type: String })
  completedByName: string | null;

  @ApiProperty({ example: null, nullable: true, type: String, format: 'date-time' })
  completedAt: Date | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: Date;

  @ApiProperty({ type: [StocktakeItemResponseDto] })
  items: StocktakeItemResponseDto[];
}

export class ReceivePurchaseOrderResponseDto {
  @ApiProperty({ example: 'PO-202611-0005' })
  poNumber: string;

  @ApiProperty({ example: 'PN-202611-0009' })
  receiptCode: string;

  @ApiProperty({ example: 'PARTIALLY_RECEIVED', description: 'Trạng thái đơn đặt hàng sau khi nhận' })
  status: string;

  @ApiProperty({ example: 3 })
  receivedLines: number;
}

export class InventoryThresholdResponseDto {
  @ApiProperty({ example: 'd1e2f3a4-0000-4000-8000-000000000018' })
  id: string;

  @ApiProperty({ example: 10 })
  minQuantity: number;

  @ApiProperty({ example: 200, nullable: true, type: Number })
  maxQuantity: number | null;
}

export class ConsistencyIssueDto {
  @ApiProperty({ example: 'LEDGER_MISMATCH' })
  type: string;

  @ApiProperty({ example: 'Số dư sổ kho khác tồn hiện tại' })
  message: string;

  @ApiProperty({ example: 40, required: false })
  expected?: number;

  @ApiProperty({ example: 38, required: false })
  actual?: number;
}

export class ConsistencyItemDto {
  @ApiProperty({ example: { id: 'c0ffee00-0000-4000-8000-000000000003', code: 'CH01', name: 'CH01 - Quận Hải Châu' } })
  store: { id: string; code: string; name: string };

  @ApiProperty({ example: { id: 'd1e2f3a4-0000-4000-8000-000000000011', sku: 'LANEIGE-WM-01', productName: 'Laneige Water Bank Essence' } })
  variant: { id: string; sku: string; productName: string };

  @ApiProperty({ example: 38 })
  quantity: number;

  @ApiProperty({ example: 0 })
  reservedQuantity: number;

  @ApiProperty({ example: 38 })
  activeBatchQuantity: number;

  @ApiProperty({ example: 0 })
  inactiveBatchQuantity: number;

  @ApiProperty({ example: 40 })
  ledgerQuantity: number;

  @ApiProperty({ type: [ConsistencyIssueDto] })
  issues: ConsistencyIssueDto[];
}

export class ConsistencySummaryDto {
  @ApiProperty({ example: 120 })
  checkedRows: number;

  @ApiProperty({ example: 2 })
  mismatchedRows: number;

  @ApiProperty({ example: { LEDGER_MISMATCH: 2 }, description: 'Số dòng lệch theo từng loại lỗi' })
  byType: Record<string, number>;

  @ApiProperty({ example: 0 })
  rowsWithoutBatches: number;

  @ApiProperty({ example: 0 })
  rowsWithoutLedger: number;

  @ApiProperty({ type: [String] })
  notes: string[];
}

export class ConsistencyReportResponseDto {
  @ApiProperty({ type: ConsistencySummaryDto })
  summary: ConsistencySummaryDto;

  @ApiProperty({ type: [ConsistencyItemDto] })
  items: ConsistencyItemDto[];
}
