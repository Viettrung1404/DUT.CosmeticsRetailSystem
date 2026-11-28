import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ReconcileBatchItemDto {
  @ApiProperty({ description: 'Mã vận đơn đối tác 3PL (GHN, Ahamove)', example: 'LAD12345678' })
  @IsString()
  @IsNotEmpty()
  trackingCode: string;

  @ApiPropertyOptional({ description: 'Mã vận đơn nội bộ GlowUp', example: 'SHIP-20261116-1234' })
  @IsString()
  @IsOptional()
  shipmentCode?: string;

  @ApiProperty({ description: 'Số tiền COD thực tế đối tác đã thu và chuyển trả (VND)', example: 300000 })
  @IsNumber()
  @Min(0)
  carrierPaidCodAmount: number;

  @ApiPropertyOptional({ description: 'Cước phí vận chuyển thực tế đối tác cấn trừ (VND)', example: 22000, default: 0 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  carrierFeeCharged?: number;

  @ApiPropertyOptional({ description: 'Ghi chú của đối tác trên bảng kê' })
  @IsString()
  @IsOptional()
  carrierNote?: string;
}

export class ReconcileBatchDto {
  @ApiProperty({ description: 'Mã kỳ/phiên đối soát duy nhất từ đối tác', example: 'REC-GHN-20261116-01' })
  @IsString()
  @IsNotEmpty()
  reconciliationCode: string;

  @ApiProperty({ description: 'Mã đối tác vận chuyển (GHN, AHAMOVE)', example: 'GHN' })
  @IsString()
  @IsNotEmpty()
  carrierCode: string;

  @ApiProperty({ description: 'Ngày phát hành bảng kê đối soát (YYYY-MM-DD)', example: '2026-11-16' })
  @IsDateString()
  reconciliationDate: string;

  @ApiPropertyOptional({ description: 'Mã tham chiếu sao kê ngân hàng đối chiếu', example: 'FT261116892301' })
  @IsString()
  @IsOptional()
  bankStatementRef?: string;

  @ApiProperty({ description: 'Danh sách các dòng bưu kiện đối soát', type: [ReconcileBatchItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReconcileBatchItemDto)
  items: ReconcileBatchItemDto[];
}

export class CodReconciliationQueryDto {
  @ApiPropertyOptional({ description: 'Lọc theo đối tác vận chuyển' })
  @IsString()
  @IsOptional()
  carrierCode?: string;

  @ApiPropertyOptional({ description: 'Lọc theo trạng thái đối soát: APPROVED, DISCREPANCY_FLAGGED, PENDING_APPROVAL' })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ description: 'Số trang', default: 1 })
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Số bản ghi trên trang', default: 20 })
  @IsOptional()
  limit?: number = 20;
}

export class CodReconciliationItemResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  shipmentId: string;

  @ApiPropertyOptional()
  shipmentCode?: string;

  @ApiProperty()
  trackingCode: string;

  @ApiProperty({ description: 'Số tiền COD GlowUp yêu cầu thu (VND)' })
  declaredCodAmount: number;

  @ApiProperty({ description: 'Số tiền COD đối tác đã thu thực tế (VND)' })
  carrierPaidCodAmount: number;

  @ApiProperty({ description: 'Chênh lệch (declared - paid) (VND)' })
  discrepancyAmount: number;

  @ApiProperty({ description: 'Cước phí vận chuyển đối tác cấn trừ (VND)' })
  carrierFeeCharged: number;

  @ApiProperty({ description: 'Trạng thái dòng: MATCHED | DISCREPANCY' })
  status: string;
}

export class CodReconciliationResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  reconciliationCode: string;

  @ApiProperty()
  carrierCode: string;

  @ApiProperty()
  reconciliationDate: string;

  @ApiProperty()
  totalCodDeclared: number;

  @ApiProperty()
  totalCodReceived: number;

  @ApiProperty()
  differenceAmount: number;

  @ApiProperty({ description: 'APPROVED (khớp 100%) | DISCREPANCY_FLAGGED (có lệch) | PENDING_APPROVAL' })
  status: string;

  @ApiPropertyOptional()
  bankStatementRef?: string | null;

  @ApiProperty()
  totalItems: number;

  @ApiProperty()
  matchedCount: number;

  @ApiProperty()
  discrepancyCount: number;

  @ApiProperty({ type: [CodReconciliationItemResponseDto] })
  items: CodReconciliationItemResponseDto[];

  @ApiProperty()
  createdAt: Date;
}
