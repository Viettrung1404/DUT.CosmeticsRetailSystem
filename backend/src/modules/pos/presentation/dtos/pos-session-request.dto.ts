import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, IsString, IsUUID, Matches, MaxLength, Min } from 'class-validator';
import { PageOptionsDto } from '@core/common/pagination.dto';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const SESSION_STATUSES = ['OPEN', 'CLOSED', 'RECONCILED'];

export class OpenPosSessionDto {
  @ApiProperty({ description: 'Cửa hàng mở ca' })
  @IsUUID('4', { message: 'storeId không hợp lệ' })
  readonly storeId: string;

  @ApiProperty({ description: 'Tiền mặt đầu ca có trong két (đồng)', example: 2000000 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Tiền đầu ca phải là số' })
  @Min(0, { message: 'Tiền đầu ca không được âm' })
  readonly openingCash: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  readonly note?: string;
}

export class ClosePosSessionDto {
  @ApiProperty({ description: 'Tiền mặt đếm được trong két khi kết ca (đồng)', example: 5350000 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Tiền đếm được phải là số' })
  @Min(0, { message: 'Tiền đếm được không được âm' })
  readonly countedCash: number;

  @ApiPropertyOptional({ description: 'Giải trình nếu két lệch' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  readonly note?: string;
}

export class ReconcilePosSessionDto {
  @ApiPropertyOptional({ description: 'Ghi chú của người chốt; bắt buộc khi ca lệch tiền mà thu ngân chưa giải trình' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  readonly note?: string;
}

export class CurrentPosSessionQueryDto {
  @ApiProperty({ description: 'Cửa hàng cần xem ca đang mở' })
  @IsUUID('4', { message: 'storeId không hợp lệ' })
  readonly storeId: string;
}

export class PosSessionQueryDto extends PageOptionsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4', { message: 'storeId không hợp lệ' })
  readonly storeId?: string;

  @ApiPropertyOptional({ description: 'Lọc theo thu ngân (id tài khoản)' })
  @IsOptional()
  @IsUUID('4', { message: 'cashierId không hợp lệ' })
  readonly cashierId?: string;

  @ApiPropertyOptional({ enum: SESSION_STATUSES })
  @IsOptional()
  @IsIn(SESSION_STATUSES, { message: 'Trạng thái ca chỉ nhận OPEN, CLOSED hoặc RECONCILED' })
  readonly status?: 'OPEN' | 'CLOSED' | 'RECONCILED';

  @ApiPropertyOptional({ description: 'Mở ca từ ngày (giờ Việt Nam), dạng YYYY-MM-DD', example: '2026-10-01' })
  @IsOptional()
  @Matches(DATE_PATTERN, { message: 'fromDate phải có dạng YYYY-MM-DD' })
  readonly fromDate?: string;

  @ApiPropertyOptional({ description: 'Mở ca đến hết ngày (giờ Việt Nam), dạng YYYY-MM-DD', example: '2026-10-31' })
  @IsOptional()
  @Matches(DATE_PATTERN, { message: 'toDate phải có dạng YYYY-MM-DD' })
  readonly toDate?: string;
}
