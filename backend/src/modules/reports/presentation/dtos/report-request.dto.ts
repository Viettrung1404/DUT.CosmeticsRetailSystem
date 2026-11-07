import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsUUID, Matches, Max, Min } from 'class-validator';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DATE_MESSAGE = 'Ngày phải có dạng YYYY-MM-DD';
const STORE_MESSAGE = 'storeId không hợp lệ';

export class ReportRangeQueryDto {
  @ApiPropertyOptional({ example: '2026-10-01', description: 'Từ ngày (giờ VN); mặc định 30 ngày gần nhất' })
  @IsOptional()
  @Matches(DATE_PATTERN, { message: DATE_MESSAGE })
  readonly from?: string;

  @ApiPropertyOptional({ example: '2026-10-31', description: 'Đến hết ngày (giờ VN); mặc định hôm nay' })
  @IsOptional()
  @Matches(DATE_PATTERN, { message: DATE_MESSAGE })
  readonly to?: string;

  @ApiPropertyOptional({ description: 'Lọc theo cửa hàng' })
  @IsOptional()
  @IsUUID('4', { message: STORE_MESSAGE })
  readonly storeId?: string;

  @ApiPropertyOptional({ description: 'Lọc theo nhân viên bán hàng (employees.id)' })
  @IsOptional()
  @IsUUID('4', { message: 'employeeId không hợp lệ' })
  readonly employeeId?: string;
}

const PERIODS = ['day', 'week', 'month', 'quarter', 'year'] as const;

export class RevenueReportQueryDto extends ReportRangeQueryDto {
  @ApiPropertyOptional({ enum: PERIODS, default: 'day' })
  @IsOptional()
  @IsIn(PERIODS, { message: 'period chỉ nhận day, week, month, quarter hoặc year' })
  readonly period?: (typeof PERIODS)[number];

  @ApiPropertyOptional({
    enum: ['previous', 'last_year'],
    description: 'So sánh với khoảng liền trước cùng độ dài hoặc cùng khoảng năm trước; bỏ trống thì không so sánh',
  })
  @IsOptional()
  @IsIn(['previous', 'last_year'], { message: 'compare chỉ nhận previous hoặc last_year' })
  readonly compare?: 'previous' | 'last_year';
}

export class ProductReportQueryDto extends ReportRangeQueryDto {
  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit phải là số nguyên' })
  @Min(1, { message: 'limit tối thiểu là 1' })
  @Max(100, { message: 'limit tối đa là 100' })
  readonly limit?: number;

  @ApiPropertyOptional({ description: 'Lọc theo danh mục, gồm cả danh mục con' })
  @IsOptional()
  @IsUUID('4', { message: 'categoryId không hợp lệ' })
  readonly categoryId?: string;
}

const EXPORT_TYPES = ['revenue', 'products', 'staff-kpi', 'rfm', 'trends', 'forecast', 'hr'] as const;
const EXPORT_FORMATS = ['xlsx', 'pdf', 'csv'] as const;

export class ExportReportQueryDto extends RevenueReportQueryDto {
  @ApiProperty({ enum: EXPORT_TYPES })
  @IsIn(EXPORT_TYPES, { message: 'type chỉ nhận revenue, products, staff-kpi, rfm, trends, forecast hoặc hr' })
  readonly type: (typeof EXPORT_TYPES)[number];

  @ApiPropertyOptional({ enum: EXPORT_FORMATS, default: 'xlsx' })
  @IsOptional()
  @IsIn(EXPORT_FORMATS, { message: 'format chỉ nhận xlsx, pdf hoặc csv' })
  readonly format?: (typeof EXPORT_FORMATS)[number];

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 10, description: 'Số dòng cho báo cáo sản phẩm' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit phải là số nguyên' })
  @Min(1, { message: 'limit tối thiểu là 1' })
  @Max(100, { message: 'limit tối đa là 100' })
  readonly limit?: number;
}

export class StoreQueryDto {
  @ApiPropertyOptional({ description: 'Lọc theo cửa hàng' })
  @IsOptional()
  @IsUUID('4', { message: STORE_MESSAGE })
  readonly storeId?: string;
}

export class RfmQueryDto extends StoreQueryDto {
  @ApiPropertyOptional({
    enum: ['CHAMPIONS', 'LOYAL', 'NEW', 'AT_RISK', 'LOST', 'NEEDS_ATTENTION'],
    description: 'Chỉ liệt kê khách thuộc nhóm này',
  })
  @IsOptional()
  @IsIn(['CHAMPIONS', 'LOYAL', 'NEW', 'AT_RISK', 'LOST', 'NEEDS_ATTENTION'], { message: 'Nhóm khách không hợp lệ' })
  readonly segment?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 1000, default: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit phải là số nguyên' })
  @Min(1, { message: 'limit tối thiểu là 1' })
  @Max(1000, { message: 'limit tối đa là 1000' })
  readonly limit?: number;
}

export class TrendsQueryDto extends ReportRangeQueryDto {
  @ApiPropertyOptional({ enum: ['day', 'month'], default: 'month' })
  @IsOptional()
  @IsIn(['day', 'month'], { message: 'granularity chỉ nhận day hoặc month' })
  readonly granularity?: 'day' | 'month';
}

export class ForecastQueryDto extends StoreQueryDto {
  @ApiPropertyOptional({ minimum: 1, maximum: 12, default: 3, description: 'Số tháng cần dự báo' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'months phải là số nguyên' })
  @Min(1, { message: 'months tối thiểu là 1' })
  @Max(12, { message: 'months tối đa là 12' })
  readonly months?: number;

  @ApiPropertyOptional({
    enum: ['sma', 'linear'],
    default: 'sma',
    description: 'sma: trung bình trượt 3 tháng; linear: hồi quy tuyến tính',
  })
  @IsOptional()
  @IsIn(['sma', 'linear'], { message: 'method chỉ nhận sma hoặc linear' })
  readonly method?: 'sma' | 'linear';
}

export class HrReportQueryDto extends StoreQueryDto {
  @ApiPropertyOptional({ example: '2026-10-01', description: 'Từ ngày (chấm công); mặc định 30 ngày gần nhất' })
  @IsOptional()
  @Matches(DATE_PATTERN, { message: DATE_MESSAGE })
  readonly from?: string;

  @ApiPropertyOptional({ example: '2026-10-31' })
  @IsOptional()
  @Matches(DATE_PATTERN, { message: DATE_MESSAGE })
  readonly to?: string;
}
