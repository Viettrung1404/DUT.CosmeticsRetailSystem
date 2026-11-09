import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator';
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
