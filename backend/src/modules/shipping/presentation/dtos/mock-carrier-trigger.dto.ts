import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class TriggerMockStatusDto {
  @ApiProperty({
    description: 'Mã vận đơn 3PL cần cập nhật trạng thái',
    example: 'MOCK-TRK-12345ABCDEF',
  })
  @IsString()
  @IsNotEmpty()
  trackingCode: string;

  @ApiProperty({
    description: 'Trạng thái vận đơn mục tiêu',
    example: 'DELIVERED',
    enum: [
      'CREATED',
      'DRIVER_ASSIGNED',
      'PICKED_UP',
      'IN_TRANSIT',
      'OUT_FOR_DELIVERY',
      'DELIVERED',
      'DELIVERY_FAILED',
      'RETURNING',
      'RETURNED',
      'CANCELLED',
    ],
  })
  @IsString()
  @IsNotEmpty()
  status: string;

  @ApiPropertyOptional({
    description: 'Mã lý do thất bại hoặc ngoại lệ (nếu có)',
    example: 'CUSTOMER_UNREACHABLE',
  })
  @IsString()
  @IsOptional()
  reasonCode?: string;

  @ApiPropertyOptional({
    description: 'Chi tiết lý do',
    example: 'Gọi 3 cuộc khách hàng không nghe máy',
  })
  @IsString()
  @IsOptional()
  reasonDetail?: string;

  @ApiPropertyOptional({
    description: 'Thời điểm xảy ra sự kiện (ISO string)',
    example: '2026-11-16T15:30:00.000Z',
  })
  @IsString()
  @IsOptional()
  occurredAt?: string;
}

export class TriggerMockStatusResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'MOCK-TRK-12345ABCDEF' })
  trackingCode: string;

  @ApiProperty({ example: 'IN_TRANSIT' })
  previousStatus: string;

  @ApiProperty({ example: 'DELIVERED' })
  newStatus: string;

  @ApiProperty({ example: 'uuid-of-shipment' })
  shipmentId: string;

  @ApiProperty({ example: '2026-11-16T15:30:00.000Z' })
  updatedAt: Date;
}
