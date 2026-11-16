import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export enum DlqStatusFilter {
  FAILED = 'FAILED',
  DEAD_LETTER = 'DEAD_LETTER',
  ALL = 'ALL',
}

export class QueryDlqMessagesDto {
  @ApiPropertyOptional({ description: 'Số trang (1-based)', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Số lượng mục trên mỗi trang (tối đa 100)', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Mã nhà vận chuyển (GHN, AHAMOVE...)', example: 'GHN' })
  @IsOptional()
  @IsString()
  carrierCode?: string;

  @ApiPropertyOptional({
    description: 'Trạng thái sự cố lọc: FAILED, DEAD_LETTER, hoặc ALL',
    enum: DlqStatusFilter,
    default: DlqStatusFilter.ALL,
  })
  @IsOptional()
  @IsEnum(DlqStatusFilter)
  status?: DlqStatusFilter = DlqStatusFilter.ALL;

  @ApiPropertyOptional({ description: 'Mã vận đơn đối soát', example: 'GHN12345678' })
  @IsOptional()
  @IsString()
  trackingCode?: string;
}

export class ReplayDlqMessagesDto {
  @ApiPropertyOptional({
    description: 'ID bản ghi webhook inbox cần replay',
    example: '11111111-2222-3333-4444-555555555555',
  })
  @IsOptional()
  @IsUUID()
  inboxId?: string;

  @ApiPropertyOptional({
    description: 'Danh sách nhiều ID bản ghi webhook inbox cần replay',
    type: [String],
    example: ['11111111-2222-3333-4444-555555555555'],
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  inboxIds?: string[];
}

export class RetryStuckOutboxDto {
  @ApiPropertyOptional({
    description: 'Ngưỡng số lần retry tối thiểu để coi là bị kẹt (mặc định 3)',
    default: 3,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  thresholdRetries?: number = 3;
}
