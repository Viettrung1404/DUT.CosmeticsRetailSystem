import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsDateString } from 'class-validator';

export class RecordFailedAttemptDto {
  @ApiPropertyOptional({
    description: 'Mã lý do giao hàng không thành công (CUSTOMER_UNREACHABLE, RESCHEDULED, WRONG_ADDRESS...)',
    example: 'CUSTOMER_UNREACHABLE',
  })
  @IsOptional()
  @IsString()
  failureReasonCode?: string;

  @ApiPropertyOptional({
    description: 'Chi tiết mô tả lý do giao thất bại',
    example: 'Gọi điện 3 cuộc khách hàng không bắt máy',
  })
  @IsOptional()
  @IsString()
  failureReasonDetail?: string;

  @ApiPropertyOptional({
    description: 'Mã trạng thái gốc từ 3PL',
    example: 'delivery_fail_call_no_answer',
  })
  @IsOptional()
  @IsString()
  carrierRawStatus?: string;

  @ApiPropertyOptional({
    description: 'Thời điểm xảy ra lần giao thất bại',
    example: '2026-11-16T15:30:00Z',
  })
  @IsOptional()
  @IsDateString()
  attemptedAt?: string | Date;
}

export class ShipmentAttemptResponseDto {
  @ApiProperty({ description: 'ID của lượt giao' })
  id: string;

  @ApiProperty({ description: 'ID vận đơn' })
  shipmentId: string;

  @ApiProperty({ description: 'Số thứ tự lần thử (1, 2, 3...)' })
  attemptNumber: number;

  @ApiProperty({ description: 'Thời điểm giao' })
  attemptedAt: Date;

  @ApiPropertyOptional({ description: 'Mã lý do' })
  failureReasonCode?: string | null;

  @ApiPropertyOptional({ description: 'Chi tiết lý do' })
  failureReasonDetail?: string | null;

  @ApiPropertyOptional({ description: 'Trạng thái raw từ đối tác' })
  carrierRawStatus?: string | null;
}
