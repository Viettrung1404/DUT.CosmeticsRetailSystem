import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class PosOrderItemDto {
  @ApiProperty({ description: 'Biến thể sản phẩm (lấy từ API quét mã / tìm sản phẩm)' })
  @IsUUID('4', { message: 'variantId không hợp lệ' })
  readonly variantId: string;

  @ApiProperty({ example: 1 })
  @IsInt({ message: 'Số lượng phải là số nguyên' })
  @Min(1, { message: 'Số lượng tối thiểu là 1' })
  @Max(999, { message: 'Số lượng tối đa là 999' })
  readonly quantity: number;
}

export class PreviewPosOrderDto {
  @ApiProperty({ description: 'Cửa hàng đang bán' })
  @IsUUID('4', { message: 'storeId không hợp lệ' })
  readonly storeId: string;

  @ApiProperty({ type: [PosOrderItemDto] })
  @IsArray()
  @ArrayMinSize(1, { message: 'Giỏ hàng đang trống' })
  @ArrayMaxSize(100, { message: 'Giỏ hàng tối đa 100 dòng' })
  @ValidateNested({ each: true })
  @Type(() => PosOrderItemDto)
  readonly items: PosOrderItemDto[];

  @ApiPropertyOptional({ description: 'Khách hàng (tra SĐT hoặc tạo nhanh); bắt buộc khi dùng voucher / điểm' })
  @IsOptional()
  @IsUUID('4', { message: 'customerId không hợp lệ' })
  readonly customerId?: string;

  @ApiPropertyOptional({ example: 'GIAM40K', description: 'Tối đa một mã giảm giá (BR-11)' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Mã giảm giá không được để trống' })
  @MaxLength(50)
  readonly couponCode?: string;

  @ApiPropertyOptional({ example: 30000, description: 'Số điểm dùng (1 điểm = 1đ, bội số 10.000)' })
  @IsOptional()
  @IsInt({ message: 'Số điểm phải là số nguyên' })
  @Min(0)
  readonly pointsToUse?: number;
}

export class PosPaymentDto {
  @ApiProperty({ enum: ['CASH', 'CARD', 'TRANSFER'] })
  @IsIn(['CASH', 'CARD', 'TRANSFER'], { message: 'Phương thức thanh toán không hợp lệ' })
  readonly method: 'CASH' | 'CARD' | 'TRANSFER';

  @ApiProperty({ example: 500000, description: 'Số tiền khách đưa theo phương thức này (CASH được phép dư để thối)' })
  @IsInt({ message: 'Số tiền phải là số nguyên (đồng)' })
  @Min(1, { message: 'Số tiền phải lớn hơn 0' })
  readonly amount: number;
}

export class CreatePosOrderDto extends PreviewPosOrderDto {
  @ApiProperty({ type: [PosPaymentDto], description: 'Mỗi phương thức khai báo một lần; đơn 0đ thì để mảng rỗng' })
  @IsArray()
  @ArrayMaxSize(3)
  @ValidateNested({ each: true })
  @Type(() => PosPaymentDto)
  readonly payments: PosPaymentDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(500)
  readonly note?: string;
}
