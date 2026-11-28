import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsNumber,
  IsString,
  Min,
  IsBoolean,
} from 'class-validator';

export class CalculateRefundDto {
  @ApiPropertyOptional({
    description: 'Chi phí vận chuyển thu hồi ghi đè thủ công (nếu có)',
    example: 25000,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  shippingFeeOverride?: number;
}

export class CreateRefundDto {
  @ApiPropertyOptional({
    description: 'Số tiền hoàn tiền mặt ghi đè bởi kế toán/quản lý (nếu có)',
    example: 180000,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  overrideAmount?: number;

  @ApiPropertyOptional({
    description: 'Số điểm tích lũy khôi phục ghi đè (nếu có)',
    example: 50,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  overridePoints?: number;

  @ApiPropertyOptional({
    description: 'Ghi chú cho lệnh hoàn tiền',
    example: 'Hoàn tiền trả hàng sản phẩm lỗi đợt 1',
  })
  @IsOptional()
  @IsString()
  note?: string;
}

export class ApproveRefundDto {
  @ApiPropertyOptional({
    description: 'Ghi chú phê duyệt',
    example: 'Kế toán trưởng phê duyệt chi hoàn tiền',
  })
  @IsOptional()
  @IsString()
  note?: string;
}

export class ExecuteRefundDto {
  @ApiPropertyOptional({
    description:
      'Cưỡng chế thanh toán hoàn tiền mặt thủ công tại quầy (bỏ qua cổng trực tuyến)',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  forceManualCashSettlement?: boolean;

  @ApiPropertyOptional({
    description: 'Ghi chú đối soát hoàn tiền thủ công / mã ủy nhiệm chi ngân hàng',
    example: 'UNC-TECHCOMBANK-998822',
  })
  @IsOptional()
  @IsString()
  manualSettlementNote?: string;
}
