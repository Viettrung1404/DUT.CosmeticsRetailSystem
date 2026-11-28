import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export enum RtoPackageCondition {
  INTACT = 'INTACT',     // Bao bì niêm phong còn nguyên vẹn -> Nhập lại Sellable Stock
  DAMAGED = 'DAMAGED',   // Rách nát, bể vỡ, mất niêm phong -> Đưa vào QUARANTINED để lập biên bản bồi thường 3PL
}

export class ReceiveRtoShipmentDto {
  @ApiProperty({
    description: 'Tình trạng bao bì kiện hàng chuyển hoàn (INTACT = Nguyên vẹn, DAMAGED = Hư hỏng/rách nát)',
    enum: RtoPackageCondition,
    example: RtoPackageCondition.INTACT,
  })
  @IsNotEmpty({ message: 'Tình trạng bao bì không được để trống' })
  @IsEnum(RtoPackageCondition, {
    message: 'Tình trạng bao bì phải là INTACT (Nguyên vẹn) hoặc DAMAGED (Hư hỏng)',
  })
  packageCondition: RtoPackageCondition;

  @ApiPropertyOptional({
    description: 'Ghi chú kiểm tra của nhân viên kho',
    example: 'Thùng hàng còn nguyên tem niêm phong GlowUp, không móp méo',
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    description: 'ID của nhân viên kho tiếp nhận',
    example: 'user-uuid-1234',
  })
  @IsOptional()
  @IsString()
  receivedById?: string;
}

export class ReceiveRtoResponseDto {
  @ApiProperty({ description: 'Kết quả thao tác' })
  success: boolean;

  @ApiProperty({ description: 'Trạng thái vận đơn sau tiếp nhận (RETURNED)' })
  status: string;

  @ApiProperty({ description: 'Tình trạng kiện hàng tiếp nhận' })
  packageCondition: RtoPackageCondition;

  @ApiProperty({ description: 'Danh sách các lô hàng đã khôi phục tồn kho (nếu INTACT)' })
  restockedLots: Array<{
    lotId: string;
    productVariantId: string;
    quantity: number;
  }>;

  @ApiProperty({ description: 'Danh sách sản phẩm đưa vào cách ly QUARANTINED (nếu DAMAGED)' })
  quarantinedItems: Array<{
    productVariantId: string;
    quantity: number;
  }>;

  @ApiProperty({ description: 'Thời điểm tiếp nhận kiện hoàn' })
  receivedAt: Date;
}
