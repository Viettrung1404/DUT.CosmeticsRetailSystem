import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class DispatchShipmentResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'CREATED', enum: ['CREATED', 'CREATION_UNKNOWN'] })
  status: string;

  @ApiProperty({ example: 'uuid-shipment-id' })
  shipmentId: string;

  @ApiProperty({ example: 'SHIP-20261116-0001' })
  shipmentCode: string;

  @ApiPropertyOptional({ example: 'MOCK-TRK-12345ABCDEF' })
  trackingCode?: string;

  @ApiPropertyOptional({ example: 'REF-12345' })
  carrierReferenceId?: string | null;

  @ApiPropertyOptional({ example: 'https://label.carrier.vn/print/123' })
  shippingLabelUrl?: string | null;

  @ApiPropertyOptional({ example: 'https://ahamove.com/share/22VMV54W' })
  trackingUrl?: string | null;

  @ApiPropertyOptional({ example: 'Quá 15 giây không có phản hồi từ hãng vận chuyển' })
  errorMessage?: string;

  @ApiPropertyOptional({ example: true })
  isTimeout?: boolean;
}

export class ReconcileShipmentDto {
  @ApiPropertyOptional({
    description: 'Trạng thái đối soát xác nhận từ hãng (true: hãng đã nhận đơn, false: hãng chưa nhận đơn)',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  carrierFound?: boolean;

  @ApiPropertyOptional({
    description: 'Mã vận đơn lấy được từ đối tác sau đối soát',
    example: 'MOCK-TRK-RECONCILED-01',
  })
  @IsString()
  @IsOptional()
  trackingCode?: string;
}

export class ReconcileShipmentResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'CREATED', enum: ['CREATED', 'PENDING_CREATION'] })
  status: string;

  @ApiProperty({ example: 'uuid-shipment-id' })
  shipmentId: string;

  @ApiProperty({ example: 'SHIP-20261116-0001' })
  shipmentCode: string;

  @ApiPropertyOptional({ example: 'MOCK-TRK-RECONCILED-01' })
  trackingCode?: string | null;

  @ApiProperty({ example: 'Đối soát thành công: Đơn đã được xác nhận trên hệ thống 3PL.' })
  message: string;
}
