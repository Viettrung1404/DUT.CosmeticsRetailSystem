import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { PageOptionsDto } from '@core/common/pagination.dto';
import { SHIPMENT_STATUSES } from '../../domain/shipment-status';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
export const startOfDayVn = (d?: string) => (d ? new Date(`${d}T00:00:00+07:00`) : undefined);
export const endOfDayVn = (d?: string) => (d ? new Date(`${d}T23:59:59.999+07:00`) : undefined);

export class AdminShipmentQueryDto extends PageOptionsDto {
  @ApiPropertyOptional({ enum: SHIPMENT_STATUSES })
  @IsOptional()
  @IsIn([...SHIPMENT_STATUSES], { message: 'Trạng thái vận đơn không hợp lệ' })
  readonly status?: string;

  @ApiPropertyOptional({ example: 'MOCK' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  readonly carrierCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4', { message: 'storeId không hợp lệ' })
  readonly storeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4', { message: 'orderId không hợp lệ' })
  readonly orderId?: string;

  @ApiPropertyOptional({ description: 'Tìm theo mã vận đơn, mã vận chuyển của hãng hoặc mã đơn hàng' })
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

export class CreateShipmentDto {
  @ApiPropertyOptional({ description: 'Mã hãng vận chuyển, mặc định MOCK (hãng giả lập)', example: 'MOCK' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  readonly carrierCode?: string;
}

export class SimulateShipmentDto {
  @ApiProperty({
    enum: SHIPMENT_STATUSES,
    description: 'Trạng thái kế tiếp hãng giả lập báo về, phải hợp lệ với trạng thái hiện tại của vận đơn',
  })
  @IsIn([...SHIPMENT_STATUSES], { message: 'Trạng thái vận đơn không hợp lệ' })
  readonly status: string;
}

export class DamagedReturnItemDto {
  @ApiProperty({ description: 'Biến thể sản phẩm bị hỏng khi vận chuyển' })
  @IsUUID('4', { message: 'productVariantId không hợp lệ' })
  readonly productVariantId: string;

  @ApiProperty({ example: 1 })
  @IsInt({ message: 'Số lượng hỏng phải là số nguyên' })
  @Min(1, { message: 'Số lượng hỏng tối thiểu là 1' })
  readonly quantity: number;
}

export class ReceiveReturnedShipmentDto {
  @ApiPropertyOptional({
    type: [DamagedReturnItemDto],
    description: 'Hàng hỏng khi vận chuyển, không nhập lại kho. Bỏ trống nếu toàn bộ còn bán được',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => DamagedReturnItemDto)
  readonly damaged?: DamagedReturnItemDto[];

  @ApiPropertyOptional({ example: 'Hộp son bị móp, 1 chai toner vỡ' })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Ghi chú tối đa 500 ký tự' })
  readonly note?: string;
}

export class ReturnedStockLineDto {
  @ApiProperty() productVariantId: string;
  @ApiPropertyOptional({ nullable: true }) batchId: string | null;
  @ApiProperty() quantity: number;
}

export class NotRestockedLineDto extends ReturnedStockLineDto {
  @ApiProperty({ example: 'Hỏng khi vận chuyển' }) reason: string;
}

export class ReceiveReturnedShipmentResultDto {
  @ApiProperty({ type: [ReturnedStockLineDto], description: 'Đã nhập lại kho, đúng lô đã xuất' })
  restocked: ReturnedStockLineDto[];
  @ApiProperty({ type: [NotRestockedLineDto], description: 'Không nhập lại: hỏng, hoặc lô đã hết hạn / ngừng dùng' })
  notRestocked: NotRestockedLineDto[];
  @ApiProperty({ description: 'Tổng tiền khách đã trả trước, đã tạo phiếu hoàn chờ Kế toán chuyển khoản (0 nếu đơn COD)' })
  refundAmount: number;
  @ApiProperty({ description: 'Đã trả lại lượt dùng mã giảm giá của đơn' }) couponReleased: boolean;
  @ApiProperty({ description: 'Số điểm đã hoàn lại cho khách' }) pointsRefunded: number;
}

export class ShipmentEventDto {
  @ApiProperty() id: string;
  @ApiProperty({ enum: SHIPMENT_STATUSES }) status: string;
  @ApiProperty() occurredAt: Date;
  @ApiProperty() receivedAt: Date;
}

export class ShipmentListItemDto {
  @ApiProperty() id: string;
  @ApiProperty({ example: 'VD261109123456' }) shipmentCode: string;
  @ApiProperty() orderId: string;
  @ApiProperty() orderNumber: string;
  @ApiProperty() storeId: string;
  @ApiProperty() storeName: string;
  @ApiProperty({ example: 'MOCK' }) carrierCode: string;
  @ApiPropertyOptional({ nullable: true }) trackingCode: string | null;
  @ApiProperty({ enum: SHIPMENT_STATUSES }) status: string;
  @ApiProperty({ description: 'Số tiền shipper phải thu hộ' }) codAmount: number;
  @ApiProperty() shippingFeePaid: number;
  @ApiProperty() failedAttempts: number;
  @ApiPropertyOptional({ nullable: true }) handedOverAt: Date | null;
  @ApiPropertyOptional({ nullable: true }) deliveredAt: Date | null;
  @ApiProperty() createdAt: Date;

  static fromDomain(item: unknown): ShipmentListItemDto {
    return Object.assign(new ShipmentListItemDto(), item);
  }
}

export class ShipmentDetailDto extends ShipmentListItemDto {
  @ApiPropertyOptional({ nullable: true }) carrierServiceCode: string | null;
  @ApiPropertyOptional({ nullable: true }) shippingLabelUrl: string | null;
  @ApiPropertyOptional({ nullable: true }) recipientName: string | null;
  @ApiPropertyOptional({ nullable: true }) recipientPhone: string | null;
  @ApiPropertyOptional({ nullable: true }) recipientAddress: string | null;
  @ApiProperty({ description: 'Trạng thái hiện tại của đơn hàng' }) orderStatus: string;
  @ApiProperty({ type: [ShipmentEventDto], description: 'Hành trình vận chuyển, cũ đến mới' }) events: ShipmentEventDto[];

  static fromDomain(detail: unknown): ShipmentDetailDto {
    return Object.assign(new ShipmentDetailDto(), detail);
  }
}

export class CarrierWebhookResultDto {
  @ApiProperty() shipmentId: string;
  @ApiProperty() orderId: string;
  @ApiProperty({ enum: SHIPMENT_STATUSES }) status: string;
  @ApiProperty({ description: 'true khi sự kiện đã được nhận trước đó (gửi lại)' }) duplicate: boolean;
  @ApiProperty({ description: 'Trạng thái đơn hàng sau khi xử lý' }) orderStatus: string;
}
