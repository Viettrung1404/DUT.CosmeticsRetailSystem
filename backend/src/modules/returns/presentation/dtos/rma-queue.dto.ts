import {
  IsOptional,
  IsInt,
  Min,
  Max,
  IsString,
  IsEnum,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { ReturnOrderStatus } from '../../domain/entities/return-policy.entity';

export enum RmaQueueSortBy {
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
  SLA = 'sla',
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class RmaQueueQueryDto {
  @ApiPropertyOptional({ description: 'Trang hiện tại (bắt đầu từ 1)', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Số lượng bản ghi trên một trang (tối đa 100)',
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Từ khóa tìm kiếm theo mã RMA, mã đơn hàng, tên hoặc SĐT khách',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description:
      'Lọc theo ID chi nhánh Showroom tiếp nhận (dành cho Admin/Tổng kho)',
  })
  @IsOptional()
  @IsUUID()
  dropoffLocationId?: string;

  @ApiPropertyOptional({
    description: 'Tiêu chí sắp xếp: createdAt, updatedAt, hoặc sla (đơn chờ lâu nhất lên đầu)',
    enum: RmaQueueSortBy,
    default: RmaQueueSortBy.CREATED_AT,
  })
  @IsOptional()
  @IsEnum(RmaQueueSortBy)
  sortBy?: RmaQueueSortBy = RmaQueueSortBy.CREATED_AT;

  @ApiPropertyOptional({
    description: 'Thứ tự sắp xếp: asc hoặc desc',
    enum: SortOrder,
    default: SortOrder.DESC,
  })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder = SortOrder.DESC;
}

export class TransitionRmaDto {
  @ApiPropertyOptional({
    description:
      'Phiên bản mong đợi của hồ sơ để kiểm soát đồng thời lạc quan OCC',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  expectedVersion?: number;

  @ApiPropertyOptional({
    description: 'Trạng thái đích muốn chuyển sang',
    enum: ReturnOrderStatus,
    example: ReturnOrderStatus.APPROVED,
  })
  @IsOptional()
  @IsEnum(ReturnOrderStatus)
  targetStatus?: ReturnOrderStatus;

  @ApiPropertyOptional({
    description: 'Hành động chuyển trạng thái (APPROVE | REJECT)',
    example: 'APPROVE',
  })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional({
    description: 'Ghi chú nghiệp vụ của điều phối viên / nhân viên xử lý',
  })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({
    description: 'Lý do từ chối nếu chuyển sang trạng thái REJECTED',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class RmaQueueSummaryDto {
  @ApiProperty({ description: 'Số hồ sơ chờ CSKH thẩm định (SUBMITTED)' })
  reviewCount: number;

  @ApiProperty({ description: 'Số hồ sơ chờ khách mang ra Showroom (AWAITING_RETURN / APPROVED)' })
  dropoffCount: number;

  @ApiProperty({ description: 'Số kiện hàng đã nhận chờ KCS kiểm định (RECEIVED)' })
  inspectionCount: number;

  @ApiProperty({ description: 'Số hồ sơ chờ phòng Tài chính quyết toán hoàn/đổi (RESOLUTION_PENDING)' })
  settlementCount: number;

  @ApiProperty({ description: 'Tổng số hồ sơ RMA đang tồn đọng trên toàn hệ thống' })
  totalPending: number;
}
