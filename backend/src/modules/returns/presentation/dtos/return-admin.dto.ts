import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { PageOptionsDto } from '@core/common/pagination.dto';
import { RETURN_CONDITIONS, ReturnCondition } from '../../domain/return-rules';
import { DATE_PATTERN } from './date-range.util';

const STATUSES = ['REQUESTED', 'APPROVED', 'RECEIVED', 'INSPECTED', 'COMPLETED', 'REJECTED'];
const TYPES = ['REFUND', 'EXCHANGE'];

export class AdminReturnQueryDto extends PageOptionsDto {
  @ApiPropertyOptional({ enum: STATUSES })
  @IsOptional()
  @IsIn(STATUSES, { message: 'Trạng thái đổi trả không hợp lệ' })
  readonly status?: string;

  @ApiPropertyOptional({ description: 'Lọc theo cửa hàng (Quản lý chỉ thấy cửa hàng mình)' })
  @IsOptional()
  @IsUUID('4', { message: 'storeId không hợp lệ' })
  readonly storeId?: string;

  @ApiPropertyOptional({ enum: TYPES })
  @IsOptional()
  @IsIn(TYPES, { message: 'Loại đổi trả chỉ nhận REFUND hoặc EXCHANGE' })
  readonly returnType?: string;

  @ApiPropertyOptional({ description: 'Tìm theo mã đổi trả, mã đơn, tên hoặc số điện thoại khách' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  readonly search?: string;

  @ApiPropertyOptional({ example: '2026-11-01' })
  @IsOptional()
  @Matches(DATE_PATTERN, { message: 'fromDate phải có dạng YYYY-MM-DD' })
  readonly fromDate?: string;

  @ApiPropertyOptional({ example: '2026-11-30' })
  @IsOptional()
  @Matches(DATE_PATTERN, { message: 'toDate phải có dạng YYYY-MM-DD' })
  readonly toDate?: string;
}

export class ReturnNoteDto {
  @ApiPropertyOptional({ description: 'Ghi chú hiển thị cho khách trong lịch sử trạng thái', example: 'Đã liên hệ khách' })
  @IsOptional()
  @IsString({ message: 'Ghi chú phải là chuỗi ký tự' })
  @MaxLength(500, { message: 'Ghi chú tối đa 500 ký tự' })
  readonly note?: string;
}

export class RejectReturnDto {
  @ApiProperty({ description: 'Lý do từ chối, khách xem được', example: 'Sản phẩm đã quá thời hạn đổi trả' })
  @IsString({ message: 'Lý do từ chối phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Phải nhập lý do từ chối' })
  @MaxLength(500, { message: 'Lý do từ chối tối đa 500 ký tự' })
  readonly reason: string;
}

export class InspectLineDto {
  @ApiProperty({ description: 'Mã dòng hàng trả (items[].id trong chi tiết)' })
  @IsUUID('4', { message: 'returnOrderItemId không hợp lệ' })
  readonly returnOrderItemId: string;

  @ApiProperty({ enum: RETURN_CONDITIONS, description: 'RESALEABLE: nhập lại kho bán; DAMAGED: hỏng, không nhập' })
  @IsIn([...RETURN_CONDITIONS], { message: 'Tình trạng chỉ nhận RESALEABLE hoặc DAMAGED' })
  readonly condition: ReturnCondition;

  @ApiPropertyOptional({ description: 'Lô nhập lại. Bỏ trống: dùng lô đã xuất bán cho dòng này (còn hạn)' })
  @IsOptional()
  @IsUUID('4', { message: 'restockBatchId không hợp lệ' })
  readonly restockBatchId?: string;

  @ApiPropertyOptional({ example: 'Còn nguyên seal' })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Ghi chú dòng tối đa 500 ký tự' })
  readonly note?: string;
}

export class InspectReturnDto {
  @ApiProperty({ type: [InspectLineDto], description: 'Phải đủ mọi dòng hàng của yêu cầu' })
  @IsArray({ message: 'items phải là mảng' })
  @ArrayMinSize(1, { message: 'Cần kiểm định ít nhất một dòng' })
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => InspectLineDto)
  readonly items: InspectLineDto[];

  @ApiPropertyOptional({ description: 'Ghi chú chung của đợt kiểm định' })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Ghi chú tối đa 500 ký tự' })
  readonly note?: string;
}

export class ReturnActionsDto {
  @ApiProperty() canApprove: boolean;
  @ApiProperty() canReject: boolean;
  @ApiProperty() canReceive: boolean;
  @ApiProperty() canInspect: boolean;
  @ApiProperty() canComplete: boolean;
}

export class ReturnListItemDto {
  @ApiProperty() id: string;
  @ApiProperty({ example: 'RMA-xxxx' }) returnCode: string;
  @ApiProperty() orderId: string;
  @ApiProperty() orderNumber: string;
  @ApiProperty() storeId: string;
  @ApiProperty() storeName: string;
  @ApiPropertyOptional({ nullable: true }) customerName: string | null;
  @ApiPropertyOptional({ nullable: true }) customerPhone: string | null;
  @ApiProperty({ enum: TYPES }) returnType: string;
  @ApiProperty({ enum: STATUSES }) status: string;
  @ApiProperty() reason: string;
  @ApiProperty() itemCount: number;
  @ApiProperty({ description: 'Tiền đã hoàn tất của yêu cầu (0 khi chưa hoàn tất)' }) refundAmount: number;
  @ApiProperty() createdAt: Date;

  static fromDomain(item: unknown): ReturnListItemDto {
    return Object.assign(new ReturnListItemDto(), item);
  }
}

export class ReturnItemDto {
  @ApiProperty() id: string;
  @ApiProperty() orderItemId: string;
  @ApiProperty() productVariantId: string;
  @ApiProperty() productName: string;
  @ApiPropertyOptional({ nullable: true }) variantName: string | null;
  @ApiProperty() sku: string;
  @ApiProperty() quantity: number;
  @ApiProperty({ description: 'Giá trị hoàn của dòng (đã trừ voucher và điểm)' }) refundAmount: number;
  @ApiPropertyOptional({ nullable: true, enum: RETURN_CONDITIONS }) condition: string | null;
  @ApiPropertyOptional({ nullable: true }) restockStoreId: string | null;
  @ApiPropertyOptional({ nullable: true }) restockBatchId: string | null;
  @ApiPropertyOptional({ nullable: true }) note: string | null;
}

export class ReturnHistoryDto {
  @ApiProperty() status: string;
  @ApiPropertyOptional({ nullable: true }) note: string | null;
  @ApiProperty() changedBy: string;
  @ApiProperty() createdAt: Date;
}

export class ReturnRefundDto {
  @ApiProperty() id: string;
  @ApiProperty() amount: number;
  @ApiProperty({ example: 'PENDING' }) status: string;
  @ApiPropertyOptional({ nullable: true }) processedAt: Date | null;
}

export class ReturnDetailDto {
  @ApiProperty() id: string;
  @ApiProperty() returnCode: string;
  @ApiProperty({ enum: TYPES }) returnType: string;
  @ApiProperty({ enum: STATUSES }) status: string;
  @ApiProperty() reason: string;
  @ApiPropertyOptional({ nullable: true }) adminNote: string | null;
  @ApiProperty() refundAmount: number;
  @ApiPropertyOptional({ nullable: true }) handledBy: string | null;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
  @ApiProperty({ description: '{ id, orderNumber, totalAmount }', type: 'object', additionalProperties: true })
  order: Record<string, unknown>;
  @ApiProperty({ description: '{ id, name, code }', type: 'object', additionalProperties: true })
  store: Record<string, unknown>;
  @ApiProperty({ description: '{ id, fullName, phone }', type: 'object', additionalProperties: true })
  customer: Record<string, unknown>;
  @ApiProperty({ type: [ReturnItemDto] }) items: ReturnItemDto[];
  @ApiProperty({ description: 'Sản phẩm khách muốn đổi sang (chỉ loại EXCHANGE)', type: 'array', items: { type: 'object' } })
  exchangeItems: { productVariantId: string; quantity: number }[];
  @ApiProperty({ description: 'Ảnh bằng chứng khách gửi: id, mimeType, size', type: 'array', items: { type: 'object' } })
  attachments: { id: string; mimeType: string | null; size: number | null }[];
  @ApiProperty({ type: [ReturnHistoryDto] }) history: ReturnHistoryDto[];
  @ApiPropertyOptional({
    nullable: true,
    description: 'Quyết toán đổi hàng sau khi khách chấp nhận báo giá',
    type: 'object',
    additionalProperties: true,
  })
  settlement: Record<string, unknown> | null;
  @ApiProperty({ type: [ReturnRefundDto], description: 'Phiếu hoàn tiền sinh ra khi kiểm định xong' })
  refunds: ReturnRefundDto[];
  @ApiProperty() quoteVersion: number;
  @ApiPropertyOptional({ nullable: true }) quoteExpiresAt: Date | null;
  @ApiProperty({ type: ReturnActionsDto }) actions: ReturnActionsDto;

  static fromDomain(detail: unknown): ReturnDetailDto {
    return Object.assign(new ReturnDetailDto(), detail);
  }
}

export class InspectResultDto {
  @ApiProperty({ description: 'Tổng số lượng đã nhập lại kho' }) restockedQuantity: number;
  @ApiProperty({ description: 'Tổng số lượng ghi nhận hỏng' }) damagedQuantity: number;
  @ApiProperty({ description: 'Đã tạo phiếu hoàn tiền PENDING (loại REFUND)' }) refundsReserved: boolean;
  @ApiProperty({ description: 'Đã lập báo giá đổi hàng cho khách (loại EXCHANGE)' }) quotePrepared: boolean;
}
