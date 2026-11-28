import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ReplacementItemDto {
  @ApiProperty({
    description: 'ID biến thể sản phẩm mới muốn đổi',
    example: 'd9b04f12-32a1-4389-9182-318391203812',
  })
  @IsUUID()
  @IsNotEmpty()
  productVariantId: string;

  @ApiProperty({
    description: 'Số lượng muốn đổi',
    example: 1,
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  quantity: number;
}

export class CalculateExchangeQuoteDto {
  @ApiProperty({
    description: 'Danh sách các sản phẩm mới khách hàng chọn đổi',
    type: [ReplacementItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReplacementItemDto)
  replacementItems: ReplacementItemDto[];

  @ApiPropertyOptional({
    description: 'Chi phí vận chuyển thu hồi ghi đè (nếu có, tuân thủ DEC-04)',
    example: 25000,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  shippingFeeOverride?: number;
}

export class CreateExchangeOrderDto {
  @ApiProperty({
    description: 'Danh sách các sản phẩm mới khách hàng chọn đổi',
    type: [ReplacementItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReplacementItemDto)
  replacementItems: ReplacementItemDto[];

  @ApiPropertyOptional({
    description: 'Phương thức thanh toán khoản chênh lệch bù thêm (nếu có)',
    example: 'COD',
    default: 'COD',
  })
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiPropertyOptional({
    description: 'Chi phí vận chuyển thu hồi ghi đè (nếu có)',
    example: 25000,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  shippingFeeOverride?: number;

  @ApiPropertyOptional({
    description: 'Ghi chú cho đơn hàng thay thế mới',
    example: 'Đổi sang màu son khác do không ưng màu cũ',
  })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({
    description: 'Địa chỉ nhận đơn hàng mới (nếu khác địa chỉ đơn gốc)',
    example: {
      addressLine: '123 Nguyễn Thị Minh Khai',
      provinceCity: 'Hồ Chí Minh',
      district: 'Quận 3',
    },
  })
  @IsOptional()
  shippingAddress?: Record<string, any>;
}
