import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { PageOptionsDto } from '@core/common/pagination.dto';

export class SearchProductsQueryDto extends PageOptionsDto {
  @ApiProperty({
    example: 'son kem',
    description: 'Từ khóa tìm kiếm (tên, thương hiệu, thành phần, danh mục, tag...)',
  })
  @IsString()
  @IsNotEmpty({ message: 'Từ khóa tìm kiếm không được để trống' })
  q: string;
}
