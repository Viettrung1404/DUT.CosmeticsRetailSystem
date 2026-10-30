import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { PageOptionsDto } from '@core/common/pagination.dto';
import { PO_STATUSES } from '../../domain/repositories/purchase-order.repository.interface';
import { SUPPLIER_PAYMENT_METHODS } from '../../application/use-cases/supplier-payments.use-case';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_MONEY = 9_999_999_999.99;
// Đọc giá trị gốc: chuyển kiểu ngầm của ValidationPipe biến chuỗi 'false' thành true
const toBoolean = ({ obj, key }: { obj: Record<string, unknown>; key: string }) => {
  const raw = obj[key];
  return raw === true || raw === 'true' ? true : raw === false || raw === 'false' ? false : raw;
};

export class SupplierQueryDto extends PageOptionsDto {
  @ApiPropertyOptional({ description: 'Tìm theo tên, mã số thuế, số điện thoại' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  readonly search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  readonly isActive?: boolean;
}

class SupplierFieldsDto {
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(100)
  readonly contactPerson?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== '')
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @MaxLength(100)
  readonly email?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== '')
  @Matches(/^[0-9+ ]{8,20}$/, { message: 'Số điện thoại không hợp lệ' })
  readonly phone?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(500)
  readonly address?: string | null;

  @ApiPropertyOptional({ nullable: true, example: '0312345678' })
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== '')
  @Matches(/^[0-9-]{10,14}$/, { message: 'Mã số thuế không hợp lệ' })
  readonly taxCode?: string | null;

  @ApiPropertyOptional({ nullable: true, example: 'Thanh toán trong 30 ngày kể từ ngày nhận hàng' })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(500)
  readonly paymentTerms?: string | null;

  @ApiPropertyOptional({ description: 'false = ngừng hợp tác (không xóa)' })
  @IsOptional()
  @IsBoolean()
  readonly isActive?: boolean;
}

export class UpdateSupplierDto extends SupplierFieldsDto {
  @ApiPropertyOptional({ example: 'Công ty TNHH Mỹ phẩm Hoa Sen' })
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Tên nhà cung cấp quá ngắn' })
  @MaxLength(200)
  readonly name?: string;
}

export class CreateSupplierDto extends SupplierFieldsDto {
  @ApiProperty({ example: 'Công ty TNHH Mỹ phẩm Hoa Sen' })
  @IsString()
  @MinLength(2, { message: 'Tên nhà cung cấp quá ngắn' })
  @MaxLength(200)
  readonly name: string;
}

export class RateSupplierDto {
  @ApiProperty({ example: 4.5, description: 'Thang 1–5' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  @Max(5)
  readonly rating: number;
}

export class PurchaseOrderLineDto {
  @ApiProperty()
  @IsUUID('4', { message: 'productVariantId không hợp lệ' })
  readonly productVariantId: string;

  @ApiProperty({ example: 50 })
  @Type(() => Number)
  @IsInt({ message: 'Số lượng đặt phải là số nguyên' })
  @Min(1)
  @Max(1_000_000)
  readonly quantity: number;

  @ApiProperty({ example: 120000, description: 'Giá nhập dự kiến / đơn vị' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(MAX_MONEY)
  readonly unitCost: number;
}

export class UpdatePurchaseOrderDto {
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(500)
  readonly note?: string | null;

  @ApiPropertyOptional({ nullable: true, example: '2026-11-10' })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @Matches(DATE_PATTERN, { message: 'expectedDate phải có dạng YYYY-MM-DD' })
  readonly expectedDate?: string | null;

  @ApiPropertyOptional({ type: [PurchaseOrderLineDto], description: 'Gửi thì thay toàn bộ dòng hàng' })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => PurchaseOrderLineDto)
  readonly items?: PurchaseOrderLineDto[];
}

export class CreatePurchaseOrderDto {
  @ApiProperty()
  @IsUUID('4', { message: 'supplierId không hợp lệ' })
  readonly supplierId: string;

  @ApiProperty({ description: 'Kho tổng nhận hàng' })
  @IsUUID('4', { message: 'storeId không hợp lệ' })
  readonly storeId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  readonly note?: string;

  @ApiPropertyOptional({ example: '2026-11-10' })
  @IsOptional()
  @Matches(DATE_PATTERN, { message: 'expectedDate phải có dạng YYYY-MM-DD' })
  readonly expectedDate?: string;

  @ApiProperty({ type: [PurchaseOrderLineDto] })
  @IsArray()
  @ArrayMinSize(1, { message: 'Phải có ít nhất một sản phẩm' })
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => PurchaseOrderLineDto)
  readonly items: PurchaseOrderLineDto[];
}

export class PurchaseOrderQueryDto extends PageOptionsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4', { message: 'supplierId không hợp lệ' })
  readonly supplierId?: string;

  @ApiPropertyOptional({ enum: PO_STATUSES })
  @IsOptional()
  @IsIn(PO_STATUSES, { message: 'Trạng thái đơn đặt hàng không hợp lệ' })
  readonly status?: string;

  @ApiPropertyOptional({ description: 'Tìm theo số PO hoặc tên NCC' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  readonly search?: string;
}

export class CreateSupplierPaymentDto {
  @ApiProperty()
  @IsUUID('4', { message: 'supplierId không hợp lệ' })
  readonly supplierId: string;

  @ApiPropertyOptional({ description: 'Trả cho đơn đặt hàng nào (không bắt buộc)' })
  @IsOptional()
  @IsUUID('4', { message: 'purchaseOrderId không hợp lệ' })
  readonly purchaseOrderId?: string;

  @ApiProperty({ example: 5000000 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1, { message: 'Số tiền phải lớn hơn 0' })
  @Max(MAX_MONEY)
  readonly amount: number;

  @ApiProperty({ enum: SUPPLIER_PAYMENT_METHODS })
  @IsIn(SUPPLIER_PAYMENT_METHODS, { message: 'Phương thức chỉ nhận BANK_TRANSFER hoặc CASH' })
  readonly paymentMethod: string;

  @ApiProperty({ example: '2026-10-30' })
  @Matches(DATE_PATTERN, { message: 'paymentDate phải có dạng YYYY-MM-DD' })
  readonly paymentDate: string;

  @ApiPropertyOptional({ example: 'UNC số 1234 ngân hàng ACB' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  readonly note?: string;
}

export class SupplierPaymentQueryDto extends PageOptionsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4', { message: 'supplierId không hợp lệ' })
  readonly supplierId?: string;
}
