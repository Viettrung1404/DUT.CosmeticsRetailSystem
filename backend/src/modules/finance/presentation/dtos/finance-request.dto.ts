import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator';
import { PageOptionsDto } from '@core/common/pagination.dto';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DATE_MESSAGE = 'Ngày phải có dạng YYYY-MM-DD';

export class PaymentHistoryQueryDto extends PageOptionsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4', { message: 'storeId không hợp lệ' })
  readonly storeId?: string;

  @ApiPropertyOptional({ example: '2026-10-01', description: 'Từ ngày (giờ VN)' })
  @IsOptional()
  @Matches(DATE_PATTERN, { message: DATE_MESSAGE })
  readonly from?: string;

  @ApiPropertyOptional({ example: '2026-10-31', description: 'Đến hết ngày (giờ VN)' })
  @IsOptional()
  @Matches(DATE_PATTERN, { message: DATE_MESSAGE })
  readonly to?: string;

  @ApiPropertyOptional({ example: 'CASH' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  readonly paymentMethod?: string;

  @ApiPropertyOptional({ example: 'COMPLETED' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  readonly status?: string;
}

export class ReconciliationQueryDto {
  @ApiProperty({ example: '2026-10-30', description: 'Ngày đối soát (giờ VN, theo thời điểm thu tiền)' })
  @Matches(DATE_PATTERN, { message: DATE_MESSAGE })
  readonly date: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4', { message: 'storeId không hợp lệ' })
  readonly storeId?: string;
}

export class MarkReconciledDto {
  @ApiProperty({ example: '2026-10-30' })
  @Matches(DATE_PATTERN, { message: DATE_MESSAGE })
  readonly date: string;

  @ApiProperty()
  @IsUUID('4', { message: 'storeId không hợp lệ' })
  readonly storeId: string;

  @ApiProperty({ enum: ['POS', 'ONLINE'] })
  @IsIn(['POS', 'ONLINE'], { message: 'channel chỉ nhận POS hoặc ONLINE' })
  readonly channel: 'POS' | 'ONLINE';

  @ApiProperty({ example: 'CASH' })
  @IsString()
  @MaxLength(20)
  readonly paymentMethod: string;
}
