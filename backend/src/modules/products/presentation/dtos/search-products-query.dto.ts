import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ProductFilterDto } from './product-filter.dto';

export class SearchProductsQueryDto extends ProductFilterDto {
  @ApiProperty({
    example: 'son kem',
    description: 'Từ khóa tìm kiếm (tên, thương hiệu, thành phần, danh mục, tag...)',
  })
  @IsString()
  @MaxLength(200)
  @IsNotEmpty({ message: 'Từ khóa tìm kiếm không được để trống' })
  q: string;
}
