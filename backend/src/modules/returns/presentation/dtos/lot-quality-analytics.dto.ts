import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class LotQualityReportQueryDto {
  @ApiPropertyOptional({ description: 'Ngưỡng tỷ lệ lỗi kích hoạt cảnh báo (%)', default: 5.0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  thresholdPercent?: number = 5.0;

  @ApiPropertyOptional({ description: 'Số lượng trả tối thiểu để tính tỷ lệ lỗi', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  minReturns?: number = 1;

  @ApiPropertyOptional({ description: 'Lọc theo ID biến thể sản phẩm' })
  @IsOptional()
  @IsString()
  variantId?: string;

  @ApiPropertyOptional({ description: 'Lọc theo ID chi nhánh/kho' })
  @IsOptional()
  @IsString()
  locationId?: string;

  @ApiPropertyOptional({ description: 'Từ ngày (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Đến ngày (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class LotQualityDetailDto {
  @ApiProperty({ description: 'ID lô hàng' })
  lotId!: string;

  @ApiProperty({ description: 'Mã lô sản xuất (Batch Code)' })
  batchCode!: string;

  @ApiProperty({ description: 'ID biến thể sản phẩm' })
  productVariantId!: string;

  @ApiProperty({ description: 'Mã SKU sản phẩm' })
  sku!: string;

  @ApiProperty({ description: 'Tên sản phẩm' })
  productName!: string;

  @ApiProperty({ description: 'ID chi nhánh lưu kho' })
  locationId!: string;

  @ApiPropertyOptional({ description: 'Tên chi nhánh/kho' })
  locationName?: string;

  @ApiProperty({ description: 'Hạn sử dụng (Expiry Date)' })
  expiryDate!: string;

  @ApiProperty({ description: 'Tổng số lượng đã xuất kho/bán' })
  totalShippedQuantity!: number;

  @ApiProperty({ description: 'Tổng số lượng đã trả về' })
  totalReturnedQuantity!: number;

  @ApiProperty({ description: 'Số lượng hàng lỗi/hỏng (KCS FAILED hoặc lý do DEFECTIVE)' })
  defectiveQuantity!: number;

  @ApiProperty({ description: 'Tỷ lệ hàng lỗi (%)' })
  defectRatePercentage!: number;

  @ApiProperty({ description: 'Cờ kích hoạt cảnh báo vượt ngưỡng' })
  isAlertTriggered!: boolean;

  @ApiProperty({ enum: ['NORMAL', 'WARNING', 'CRITICAL'], description: 'Mức độ cảnh báo' })
  alertSeverity!: 'NORMAL' | 'WARNING' | 'CRITICAL';

  @ApiProperty({
    enum: ['NORMAL', 'MONITOR', 'QUARANTINE_LOT_IMMEDIATELY'],
    description: 'Hành động khuyến nghị cho quản lý kho',
  })
  recommendedAction!: 'NORMAL' | 'MONITOR' | 'QUARANTINE_LOT_IMMEDIATELY';
}

export class ReturnReasonBreakdownQueryDto {
  @ApiPropertyOptional({ description: 'Từ ngày (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Đến ngày (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Lọc theo ID biến thể sản phẩm' })
  @IsOptional()
  @IsString()
  variantId?: string;
}

export class ReturnReasonItemDto {
  @ApiProperty({ description: 'Mã lý do trả hàng (reasonCode)' })
  reasonCode!: string;

  @ApiProperty({ description: 'Số lượng sản phẩm yêu cầu trả' })
  count!: number;

  @ApiProperty({ description: 'Tỷ lệ phần trăm trên tổng số lượng hàng trả (%)' })
  percentage!: number;

  @ApiProperty({ description: 'Tổng số tiền hoàn dự kiến hoặc thực tế' })
  totalRefundAmount!: number;
}

export class ReturnReasonBreakdownResponseDto {
  @ApiProperty({ description: 'Tổng số lượng sản phẩm trả' })
  totalReturns!: number;

  @ApiProperty({ description: 'Tổng giá trị tiền hoàn' })
  totalRefundValue!: number;

  @ApiProperty({ type: [ReturnReasonItemDto], description: 'Phân rã chi tiết theo lý do' })
  reasons!: ReturnReasonItemDto[];
}

export class CarrierDamageQueryDto {
  @ApiPropertyOptional({ description: 'Từ ngày (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Đến ngày (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class CarrierDamageMetricDto {
  @ApiProperty({ description: 'Mã đối tác vận chuyển (GHN, AHAMOVE)' })
  carrierCode!: string;

  @ApiProperty({ description: 'Tổng số đơn hàng xuất kho đã giao thành công' })
  totalDeliveredShipments!: number;

  @ApiProperty({ description: 'Số đơn hoàn trả do bể vỡ / hư hại vận chuyển (DAMAGED_IN_TRANSIT)' })
  damagedReturnsCount!: number;

  @ApiProperty({ description: 'Tỷ lệ hư hại trong quá trình vận chuyển (%)' })
  damageRatePercentage!: number;
}

export class CarrierDamageResponseDto {
  @ApiProperty({ description: 'Khoảng thời gian thống kê' })
  period!: {
    startDate?: string;
    endDate?: string;
  };

  @ApiProperty({ type: [CarrierDamageMetricDto], description: 'Chỉ số so sánh giữa các hãng vận chuyển' })
  carriers!: CarrierDamageMetricDto[];
}
