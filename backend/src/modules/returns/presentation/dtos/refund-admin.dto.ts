import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator';
import { PageOptionsDto } from '@core/common/pagination.dto';
import { REFUND_METHODS, RefundMethod } from '../../domain/refund-rules';
import { DATE_PATTERN } from './date-range.util';

const STATUSES = ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'];

export class AdminRefundQueryDto extends PageOptionsDto {
  @ApiPropertyOptional({ enum: STATUSES })
  @IsOptional()
  @IsIn(STATUSES, { message: 'Trạng thái hoàn tiền không hợp lệ' })
  readonly status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4', { message: 'storeId không hợp lệ' })
  readonly storeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4', { message: 'orderId không hợp lệ' })
  readonly orderId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4', { message: 'returnOrderId không hợp lệ' })
  readonly returnOrderId?: string;

  @ApiPropertyOptional({ description: 'Tìm theo mã đơn, mã đổi trả hoặc mã tham chiếu giao dịch hoàn' })
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

export class ProcessRefundDto {
  @ApiProperty({
    enum: REFUND_METHODS,
    description: 'CASH: tiền mặt; BANK_TRANSFER: chuyển khoản; GATEWAY_MANUAL: hoàn thủ công trên trang cổng thanh toán',
  })
  @IsIn([...REFUND_METHODS], { message: 'Phương thức hoàn chỉ nhận CASH, BANK_TRANSFER hoặc GATEWAY_MANUAL' })
  readonly method: RefundMethod;

  @ApiPropertyOptional({ description: 'Mã tham chiếu giao dịch hoàn. Bắt buộc khi không phải tiền mặt', example: 'FT26110912345' })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Mã tham chiếu tối đa 100 ký tự' })
  readonly reference?: string;

  @ApiPropertyOptional({ example: 'Đã chuyển khoản vào tài khoản khách' })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Ghi chú tối đa 500 ký tự' })
  readonly note?: string;
}

export class RejectRefundDto {
  @ApiProperty({ example: 'Khách chưa cung cấp tài khoản nhận tiền' })
  @IsString({ message: 'Lý do phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Phải nhập lý do từ chối' })
  @MaxLength(500, { message: 'Lý do tối đa 500 ký tự' })
  readonly reason: string;
}

export class RefundListItemDto {
  @ApiProperty() id: string;
  @ApiProperty() orderId: string;
  @ApiProperty() orderNumber: string;
  @ApiProperty() storeId: string;
  @ApiProperty() storeName: string;
  @ApiPropertyOptional({ nullable: true }) customerName: string | null;
  @ApiPropertyOptional({ nullable: true }) returnOrderId: string | null;
  @ApiPropertyOptional({ nullable: true }) returnCode: string | null;
  @ApiProperty() amount: number;
  @ApiProperty({ enum: STATUSES }) status: string;
  @ApiPropertyOptional({ nullable: true, description: 'Phương thức khách đã dùng để thanh toán', example: 'SEPAY' })
  paymentMethod: string | null;
  @ApiProperty() createdAt: Date;
  @ApiPropertyOptional({ nullable: true }) processedAt: Date | null;
  @ApiProperty({ enum: REFUND_METHODS, isArray: true, description: 'Phương thức hoàn người đang đăng nhập được chọn' })
  allowedMethods: RefundMethod[];
  @ApiProperty({ description: 'Người đăng nhập xử lý được phiếu này' }) canProcess: boolean;

  static fromDomain(item: unknown): RefundListItemDto {
    return Object.assign(new RefundListItemDto(), item);
  }
}

export class RefundProcessingDto {
  @ApiProperty({ example: 'REFUND_PROCESS' }) action: string;
  @ApiPropertyOptional({ nullable: true }) method: string | null;
  @ApiPropertyOptional({ nullable: true }) reference: string | null;
  @ApiPropertyOptional({ nullable: true }) note: string | null;
  @ApiPropertyOptional({ nullable: true }) userId: string | null;
  @ApiProperty() at: Date;
}

export class RefundDetailDto extends RefundListItemDto {
  @ApiProperty() reason: string;
  @ApiPropertyOptional({ nullable: true, description: 'Mã tham chiếu giao dịch hoàn' }) refundTransactionId: string | null;
  @ApiPropertyOptional({
    nullable: true,
    description: 'Khoản thanh toán gốc: id, paymentMethod, amount, transactionId, paidAt',
    type: 'object',
    additionalProperties: true,
  })
  payment: Record<string, unknown> | null;
  @ApiPropertyOptional({
    nullable: true,
    description: 'Yêu cầu đổi trả liên quan: id, returnCode, returnType, status',
    type: 'object',
    additionalProperties: true,
  })
  returnOrder: Record<string, unknown> | null;
  @ApiProperty({ type: [RefundProcessingDto], description: 'Lịch sử xử lý (ai, cách hoàn, mã tham chiếu)' })
  processing: RefundProcessingDto[];

  static fromDomain(detail: unknown): RefundDetailDto {
    return Object.assign(new RefundDetailDto(), detail);
  }
}
