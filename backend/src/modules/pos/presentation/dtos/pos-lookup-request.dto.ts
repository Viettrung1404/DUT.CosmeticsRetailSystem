import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, IsUUID, Matches, MaxLength } from 'class-validator';
import { PageOptionsDto } from '@core/common/pagination.dto';

const PHONE_PATTERN = /^\+?\d{9,15}$/;
const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class ScanProductQueryDto {
  @ApiProperty({ description: 'Mã vạch của biến thể' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Mã vạch không được để trống' })
  @MaxLength(100)
  readonly barcode: string;

  @ApiProperty({ description: 'Cửa hàng đang bán' })
  @IsUUID('4', { message: 'storeId không hợp lệ' })
  readonly storeId: string;
}

export class SearchProductQueryDto extends PageOptionsDto {
  @ApiProperty({ description: 'Tên sản phẩm hoặc SKU' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Từ khóa không được để trống' })
  @MaxLength(100)
  readonly q: string;

  @ApiProperty({ description: 'Cửa hàng đang bán' })
  @IsUUID('4', { message: 'storeId không hợp lệ' })
  readonly storeId: string;
}

export class LookupCustomerQueryDto {
  @ApiProperty({ example: '0905000003' })
  @Transform(trim)
  @Matches(PHONE_PATTERN, { message: 'Số điện thoại không hợp lệ' })
  readonly phone: string;
}

export class CreatePosCustomerDto {
  @ApiProperty({ example: '0905000003' })
  @Transform(trim)
  @Matches(PHONE_PATTERN, { message: 'Số điện thoại không hợp lệ' })
  readonly phone: string;

  @ApiProperty({ example: 'Lê Văn Quầy' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Họ tên không được để trống' })
  @MaxLength(100)
  readonly fullName: string;
}
