import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class AddToCartDto {
  @ApiProperty({ description: 'ID của biến thể sản phẩm (product_variant_id)' })
  @IsUUID('all', { message: 'product_variant_id phải là định dạng UUID' })
  @IsNotEmpty({ message: 'product_variant_id không được để trống' })
  productVariantId: string;

  @ApiProperty({ description: 'Số lượng thêm vào giỏ (1 - 99)', example: 1, minimum: 1, maximum: 99 })
  @IsInt({ message: 'Số lượng phải là số nguyên' })
  @Min(1, { message: 'Số lượng tối thiểu là 1' })
  @Max(99, { message: 'Số lượng tối đa cho mỗi sản phẩm là 99' })
  quantity: number;

  @ApiPropertyOptional({ description: 'Session ID dành cho khách vãng lai (Guest) chưa đăng nhập' })
  @IsString()
  @IsOptional()
  sessionId?: string;

  @ApiPropertyOptional({ description: 'ID chi nhánh nếu khách chọn click-and-collect' })
  @IsUUID('all', { message: 'storeId phải là định dạng UUID' })
  @IsOptional()
  storeId?: string;
}
