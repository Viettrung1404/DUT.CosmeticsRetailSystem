import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
  NotEquals,
  ValidateNested,
} from 'class-validator';
import { PageOptionsDto } from '@core/common/pagination.dto';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const STOCK_STATUSES = ['LOW_STOCK', 'OUT_OF_STOCK', 'IN_STOCK'];

export class InventoryQueryDto extends PageOptionsDto {
  @ApiPropertyOptional({ description: 'Lọc một cửa hàng / kho (phải thuộc phạm vi của bạn)' })
  @IsOptional()
  @IsUUID('4', { message: 'storeId không hợp lệ' })
  readonly storeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4', { message: 'categoryId không hợp lệ' })
  readonly categoryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4', { message: 'brandId không hợp lệ' })
  readonly brandId?: string;

  @ApiPropertyOptional({ description: 'Tìm theo tên sản phẩm, SKU hoặc mã vạch' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  readonly search?: string;

  @ApiPropertyOptional({
    enum: STOCK_STATUSES,
    description: 'LOW_STOCK: tồn ≤ ngưỡng tối thiểu; OUT_OF_STOCK: hết hàng khả dụng; IN_STOCK: còn hàng khả dụng',
  })
  @IsOptional()
  @IsIn(STOCK_STATUSES, { message: 'status chỉ nhận LOW_STOCK, OUT_OF_STOCK hoặc IN_STOCK' })
  readonly status?: 'LOW_STOCK' | 'OUT_OF_STOCK' | 'IN_STOCK';
}

export class PosInventoryQueryDto extends PageOptionsDto {
  @ApiProperty({ description: 'Cửa hàng đang trực' })
  @IsUUID('4', { message: 'storeId không hợp lệ' })
  readonly storeId: string;

  @ApiPropertyOptional({ description: 'Tìm theo tên sản phẩm, SKU hoặc mã vạch' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  readonly search?: string;
}

export class ReceiveItemDto {
  @ApiProperty({ description: 'Dòng hàng trong đơn đặt hàng (purchase_order_items.id)' })
  @IsUUID('4', { message: 'purchaseOrderItemId không hợp lệ' })
  readonly purchaseOrderItemId: string;

  @ApiProperty({ example: 50 })
  @Type(() => Number)
  @IsInt({ message: 'Số lượng nhận phải là số nguyên' })
  @Min(1, { message: 'Số lượng nhận phải lớn hơn 0' })
  readonly quantity: number;

  @ApiProperty({ example: 'LOT2610A' })
  @IsString()
  @MaxLength(100)
  readonly batchNumber: string;

  @ApiProperty({ description: 'Hạn sử dụng, dạng YYYY-MM-DD', example: '2028-06-30' })
  @Matches(DATE_PATTERN, { message: 'expiryDate phải có dạng YYYY-MM-DD' })
  readonly expiryDate: string;

  @ApiPropertyOptional({ description: 'Ngày sản xuất, dạng YYYY-MM-DD', example: '2026-06-30' })
  @IsOptional()
  @Matches(DATE_PATTERN, { message: 'manufactureDate phải có dạng YYYY-MM-DD' })
  readonly manufactureDate?: string;
}

export class ReceivePurchaseOrderDto {
  @ApiProperty({ description: 'Đơn đặt hàng nhà cung cấp cần nhận' })
  @IsUUID('4', { message: 'purchaseOrderId không hợp lệ' })
  readonly purchaseOrderId: string;

  @ApiProperty({ type: [ReceiveItemDto], description: 'Một dòng hàng có thể chia nhiều lô' })
  @IsArray()
  @ArrayMinSize(1, { message: 'Phải có ít nhất một dòng hàng' })
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => ReceiveItemDto)
  readonly items: ReceiveItemDto[];

  @ApiPropertyOptional({ description: 'Ghi chú kiểm hàng (hàng móp, thiếu...)' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  readonly note?: string;
}

export class AdjustInventoryDto {
  @ApiProperty({ description: 'Cửa hàng / kho điều chỉnh' })
  @IsUUID('4', { message: 'storeId không hợp lệ' })
  readonly storeId: string;

  @ApiProperty()
  @IsUUID('4', { message: 'productVariantId không hợp lệ' })
  readonly productVariantId: string;

  @ApiProperty({
    description: 'Số âm = xuất (hủy hàng hết hạn, mất mát); số dương = nhập hàng 0 đồng (mẫu thử, giao bù)',
    example: -3,
  })
  @Type(() => Number)
  @IsInt({ message: 'Số lượng điều chỉnh phải là số nguyên' })
  @NotEquals(0, { message: 'Số lượng điều chỉnh phải khác 0' })
  readonly quantity: number;

  @ApiProperty({ example: 'Hủy 3 hộp hết hạn' })
  @IsString()
  @MaxLength(500)
  readonly reason: string;

  @ApiPropertyOptional({ description: 'Chọn đúng lô; bỏ trống thì hệ thống tự chọn theo FEFO khi xuất' })
  @IsOptional()
  @IsUUID('4', { message: 'batchId không hợp lệ' })
  readonly batchId?: string;

  @ApiPropertyOptional({ description: 'Khi nhập thêm vào lô mới: số lô' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  readonly batchNumber?: string;

  @ApiPropertyOptional({ description: 'Khi nhập thêm vào lô mới: hạn sử dụng YYYY-MM-DD' })
  @IsOptional()
  @Matches(DATE_PATTERN, { message: 'expiryDate phải có dạng YYYY-MM-DD' })
  readonly expiryDate?: string;

  @ApiPropertyOptional({ description: 'Khi nhập thêm vào lô mới: ngày sản xuất YYYY-MM-DD' })
  @IsOptional()
  @Matches(DATE_PATTERN, { message: 'manufactureDate phải có dạng YYYY-MM-DD' })
  readonly manufactureDate?: string;
}
