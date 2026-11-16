import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString } from 'class-validator';

export class ConfirmHandoverDto {
  @ApiPropertyOptional({
    description: 'Phiên bản kỳ vọng để kiểm soát đồng thời (OCC)',
    example: 3,
  })
  @IsInt()
  @IsOptional()
  expectedVersion?: number;

  @ApiPropertyOptional({
    description: 'Tên tài xế/bưu tá nhận hàng',
    example: 'Nguyễn Văn Tài',
  })
  @IsString()
  @IsOptional()
  driverName?: string;

  @ApiPropertyOptional({
    description: 'Số điện thoại tài xế',
    example: '0901234567',
  })
  @IsString()
  @IsOptional()
  driverPhone?: string;

  @ApiPropertyOptional({
    description: 'Biển số xe / mã bưu tá',
    example: '29C-12345',
  })
  @IsString()
  @IsOptional()
  driverLicensePlate?: string;

  @ApiPropertyOptional({
    description: 'Ghi chú bàn giao',
    example: 'Bàn giao ca sáng 10h',
  })
  @IsString()
  @IsOptional()
  note?: string;
}

export class ConfirmHandoverResponseDto {
  success: boolean;
  status: string;
  handedOverAt: Date;
  fulfillmentOrderId: string;
  shipmentId: string;
  trackingCode: string;
  orderStatus: string;
}
