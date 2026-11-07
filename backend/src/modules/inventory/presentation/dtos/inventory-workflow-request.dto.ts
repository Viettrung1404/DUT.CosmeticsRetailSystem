import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { PageOptionsDto } from '@core/common/pagination.dto';
import { ADJUSTMENT_STATUSES } from '../../domain/repositories/adjustment.repository.interface';
import { TRANSFER_STATUSES } from '../../domain/repositories/transfer.repository.interface';
import { VARIANCE_REASONS } from '../../domain/repositories/stocktake.repository.interface';

const STOCKTAKE_STATUSES = ['DRAFT', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
// Đọc giá trị gốc: chuyển kiểu ngầm của ValidationPipe biến chuỗi 'false' thành true
const toBoolean = ({ obj, key }: { obj: Record<string, unknown>; key: string }) => {
  const raw = obj[key];
  return raw === true || raw === 'true' ? true : raw === false || raw === 'false' ? false : raw;
};

export class UpdateThresholdsDto {
  @ApiProperty({ example: 10, description: 'Tồn khả dụng dưới mức này thì cảnh báo' })
  @Type(() => Number)
  @IsInt({ message: 'Mức tồn tối thiểu phải là số nguyên' })
  @Min(0)
  @Max(1_000_000)
  readonly minQuantity: number;

  @ApiPropertyOptional({ example: 200, nullable: true, description: 'null = bỏ mức tối đa' })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @Type(() => Number)
  @IsInt({ message: 'Mức tồn tối đa phải là số nguyên' })
  @Min(0)
  @Max(1_000_000)
  readonly maxQuantity?: number | null;
}

export class StoreQueryDto extends PageOptionsDto {
  @ApiPropertyOptional({ description: 'Lọc một địa điểm (phải thuộc phạm vi của bạn)' })
  @IsOptional()
  @IsUUID('4', { message: 'storeId không hợp lệ' })
  readonly storeId?: string;
}

export class AdjustmentQueryDto extends StoreQueryDto {
  @ApiPropertyOptional({ enum: ADJUSTMENT_STATUSES })
  @IsOptional()
  @IsIn(ADJUSTMENT_STATUSES, { message: 'Trạng thái phiếu điều chỉnh không hợp lệ' })
  readonly status?: string;
}

export class ReviewNoteDto {
  @ApiPropertyOptional({ example: 'Đã xem ảnh hàng hư' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  readonly note?: string;
}

export class TransferLineDto {
  @ApiProperty()
  @IsUUID('4', { message: 'productVariantId không hợp lệ' })
  readonly productVariantId: string;

  @ApiProperty({ example: 20 })
  @Type(() => Number)
  @IsInt({ message: 'Số lượng phải là số nguyên' })
  @Min(1, { message: 'Số lượng phải lớn hơn 0' })
  readonly quantity: number;
}

export class CreateTransferDto {
  @ApiProperty({ description: 'Kho tổng xuất hàng' })
  @IsUUID('4', { message: 'fromStoreId không hợp lệ' })
  readonly fromStoreId: string;

  @ApiProperty({ description: 'Cửa hàng nhận (thuộc phạm vi của bạn)' })
  @IsUUID('4', { message: 'toStoreId không hợp lệ' })
  readonly toStoreId: string;

  @ApiPropertyOptional({ example: 'Bổ sung hàng cuối tuần' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  readonly note?: string;

  @ApiProperty({ type: [TransferLineDto] })
  @IsArray()
  @ArrayMinSize(1, { message: 'Phải có ít nhất một sản phẩm' })
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => TransferLineDto)
  readonly items: TransferLineDto[];
}

export class UpdateTransferDraftDto {
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(500)
  readonly note?: string | null;

  @ApiPropertyOptional({ type: [TransferLineDto], description: 'Gửi thì thay toàn bộ danh sách dòng' })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1, { message: 'Phải có ít nhất một sản phẩm' })
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => TransferLineDto)
  readonly items?: TransferLineDto[];
}

export class ApproveTransferLineDto {
  @ApiProperty()
  @IsUUID('4', { message: 'itemId không hợp lệ' })
  readonly itemId: string;

  @ApiProperty({ example: 15, description: 'Số kho tổng đáp ứng, 0 = không đáp ứng dòng này' })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  readonly quantityApproved: number;
}

export class ApproveTransferDto {
  @ApiPropertyOptional({ type: [ApproveTransferLineDto], description: 'Bỏ trống = đáp ứng đủ số yêu cầu' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => ApproveTransferLineDto)
  readonly items?: ApproveTransferLineDto[];
}

export class ReceiveTransferLineDto {
  @ApiProperty()
  @IsUUID('4', { message: 'itemId không hợp lệ' })
  readonly itemId: string;

  @ApiProperty({ example: 9 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  readonly quantityReceived: number;

  @ApiPropertyOptional({ example: 'Vỡ 1 chai khi vận chuyển' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  readonly lossReason?: string;
}

export class ReceiveTransferDto {
  @ApiPropertyOptional({ type: [ReceiveTransferLineDto], description: 'Dòng không gửi = nhận đủ số đã xuất' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(400)
  @ValidateNested({ each: true })
  @Type(() => ReceiveTransferLineDto)
  readonly items?: ReceiveTransferLineDto[];
}

export class TransferQueryDto extends StoreQueryDto {
  @ApiPropertyOptional({ enum: TRANSFER_STATUSES })
  @IsOptional()
  @IsIn(TRANSFER_STATUSES, { message: 'Trạng thái phiếu chuyển kho không hợp lệ' })
  readonly status?: string;
}

export class CreateStocktakeDto {
  @ApiProperty()
  @IsUUID('4', { message: 'storeId không hợp lệ' })
  readonly storeId: string;

  @ApiPropertyOptional({ example: 'Kiểm kê cuối tháng 10' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  readonly note?: string;
}

export class StocktakeCountDto {
  @ApiProperty()
  @IsUUID('4', { message: 'productVariantId không hợp lệ' })
  readonly productVariantId: string;

  @ApiPropertyOptional({ description: 'Bắt buộc với sản phẩm đang quản lý theo lô' })
  @IsOptional()
  @IsUUID('4', { message: 'batchId không hợp lệ' })
  readonly batchId?: string;

  @ApiProperty({ example: 48 })
  @Type(() => Number)
  @IsInt({ message: 'Số đếm phải là số nguyên' })
  @Min(0)
  readonly actualQuantity: number;

  @ApiPropertyOptional({ enum: VARIANCE_REASONS })
  @IsOptional()
  @IsIn(VARIANCE_REASONS, { message: 'Lý do chênh lệch chỉ nhận DAMAGED, EXPIRED, THEFT, MISPLACED' })
  readonly varianceReason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  readonly note?: string;
}

export class RecordStocktakeCountsDto {
  @ApiProperty({ type: [StocktakeCountDto] })
  @IsArray()
  @ArrayMinSize(1, { message: 'Phải có ít nhất một dòng số đếm' })
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => StocktakeCountDto)
  readonly items: StocktakeCountDto[];
}

export class StocktakeQueryDto extends StoreQueryDto {
  @ApiPropertyOptional({ enum: STOCKTAKE_STATUSES })
  @IsOptional()
  @IsIn(STOCKTAKE_STATUSES, { message: 'Trạng thái phiếu kiểm kê không hợp lệ' })
  readonly status?: string;
}

export class BatchQueryDto extends PageOptionsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4', { message: 'storeId không hợp lệ' })
  readonly storeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4', { message: 'productVariantId không hợp lệ' })
  readonly productVariantId?: string;

  @ApiPropertyOptional({ description: 'Tìm theo số lô, SKU, tên sản phẩm' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  readonly search?: string;

  @ApiPropertyOptional({ enum: [30, 60, 90], description: 'Lô còn hạn nhưng hết hạn trong N ngày tới' })
  @IsOptional()
  @Type(() => Number)
  @IsIn([30, 60, 90], { message: 'expiringWithinDays chỉ nhận 30, 60 hoặc 90' })
  readonly expiringWithinDays?: number;

  @ApiPropertyOptional({ description: 'true = chỉ lô đã hết hạn' })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  readonly expired?: boolean;

  @ApiPropertyOptional({ description: 'false = chỉ lô đang khóa' })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  readonly isActive?: boolean;

  @ApiPropertyOptional({ description: 'true = gồm cả lô đã hết số lượng' })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  readonly includeEmpty?: boolean;
}

export class LockBatchDto {
  @ApiPropertyOptional({ example: 'Khách phản ánh kích ứng, chờ NCC kiểm tra', description: 'Bắt buộc khi khóa' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  readonly reason?: string;
}
