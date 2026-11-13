import { ApiProperty } from '@nestjs/swagger';

export class PaymentHistoryItemDto {
  @ApiProperty({ example: 'b1f2c3d4-0000-4000-8000-000000000001' })
  id: string;

  @ApiProperty({ example: 'b1f2c3d4-0000-4000-8000-000000000002' })
  orderId: string;

  @ApiProperty({ example: 'ORD202611090001' })
  orderNumber: string;

  @ApiProperty({ example: 'c0ffee00-0000-4000-8000-000000000003' })
  storeId: string;

  @ApiProperty({ example: 'CH01 - Quận Hải Châu' })
  storeName: string;

  @ApiProperty({ enum: ['POS', 'ONLINE'], example: 'POS' })
  channel: 'POS' | 'ONLINE';

  @ApiProperty({ example: null, nullable: true })
  posSessionId: string | null;

  @ApiProperty({ example: 'CA-CH01-20261109-01', nullable: true })
  posSessionCode: string | null;

  @ApiProperty({ example: 'CASH' })
  paymentMethod: string;

  @ApiProperty({ example: 250000 })
  amount: number;

  @ApiProperty({ example: 'COMPLETED' })
  status: string;

  @ApiProperty({ example: null, nullable: true })
  transactionId: string | null;

  @ApiProperty({ example: '2026-11-09T03:15:00.000Z', nullable: true, type: String, format: 'date-time' })
  paidAt: Date | null;

  @ApiProperty({ example: null, nullable: true, type: String, format: 'date-time' })
  reconciledAt: Date | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: Date;
}

export class ReconciliationGroupDto {
  @ApiProperty({ example: 'c0ffee00-0000-4000-8000-000000000003' })
  storeId: string;

  @ApiProperty({ example: 'CH01 - Quận Hải Châu' })
  storeName: string;

  @ApiProperty({ enum: ['POS', 'ONLINE'] })
  channel: 'POS' | 'ONLINE';

  @ApiProperty({ example: 'CASH' })
  paymentMethod: string;

  @ApiProperty({ example: 12, description: 'Số giao dịch COMPLETED trong nhóm' })
  count: number;

  @ApiProperty({ example: 3150000 })
  amount: number;

  @ApiProperty({ example: 0 })
  reconciledCount: number;

  @ApiProperty({ example: 0, description: 'Số ca POS còn chưa RECONCILED (nhóm ONLINE luôn 0)' })
  unreconciledSessions: number;

  @ApiProperty({ example: true })
  canMark: boolean;
}

export class ReconciliationResponseDto {
  @ApiProperty({ example: '2026-11-09' })
  date: string;

  @ApiProperty({ type: [ReconciliationGroupDto] })
  groups: ReconciliationGroupDto[];
}

export class MarkReconciledResponseDto {
  @ApiProperty({ example: 12 })
  marked: number;
}
