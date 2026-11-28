import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsArray,
  ValidateNested,
  IsNumber,
  Min,
  Max,
  IsOptional,
  IsBoolean,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReturnDisposition } from '../../domain/entities/return-policy.entity';

export class InspectionItemResultDto {
  @ApiProperty({ description: 'ID của dòng sản phẩm hoàn trả (return_order_items.id)' })
  @IsString()
  @IsNotEmpty()
  returnItemId: string;

  @ApiProperty({ description: 'Số lượng sản phẩm đạt tiêu chuẩn KCS', example: 1 })
  @IsNumber()
  @Min(0)
  passedQuantity: number;

  @ApiProperty({ description: 'Số lượng sản phẩm không đạt tiêu chuẩn KCS', example: 0 })
  @IsNumber()
  @Min(0)
  failedQuantity: number;

  @ApiProperty({ description: 'Tình trạng tem niêm phong / seal còn nguyên vẹn hay không', example: true })
  @IsBoolean()
  isSealIntact: boolean;

  @ApiPropertyOptional({
    description: 'Dung tích còn lại của sản phẩm (0-100%). Bắt buộc đối với lý do kích ứng da ALLERGIC (DEC-05)',
    example: 90,
    default: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  remainingPercentage?: number;

  @ApiProperty({
    description: 'Quyết định định đoạt tồn kho: RESTOCK, SCRAP, RETURN_TO_CUSTOMER, QUARANTINE',
    enum: ReturnDisposition,
    example: ReturnDisposition.RESTOCK,
  })
  @IsEnum(ReturnDisposition)
  @IsNotEmpty()
  disposition: ReturnDisposition;

  @ApiPropertyOptional({
    description: 'Chi tiết đánh giá của KCS viên (lỗi vỏ hộp, hao hụt, vết xước...)',
    example: 'Hàng nguyên seal, hộp không cấn móp, đủ điều kiện tái nhập kho',
  })
  @IsOptional()
  @IsString()
  reasonDetail?: string;

  @ApiPropertyOptional({
    description: 'Mã lô cụ thể để nhập lại kho (nếu có)',
    example: 'lot-uuid-1234',
  })
  @IsOptional()
  @IsString()
  lotId?: string;
}

export class CompleteInspectionDto {
  @ApiPropertyOptional({
    description: 'Ghi chú tổng quát của KCS viên hoặc hội đồng thẩm định',
    example: 'Đã hoàn tất kiểm định đợt hàng hoàn trả. Seal nguyên vẹn.',
  })
  @IsOptional()
  @IsString()
  inspectorNotes?: string;

  @ApiProperty({
    description: 'Danh sách kết quả kiểm định chi tiết từng mặt hàng',
    type: [InspectionItemResultDto],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'Biên bản kiểm định phải chứa ít nhất 1 mặt hàng' })
  @ValidateNested({ each: true })
  @Type(() => InspectionItemResultDto)
  items: InspectionItemResultDto[];
}
