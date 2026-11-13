import { ApiProperty } from '@nestjs/swagger';

export class ProductTagResponseDto {
  @ApiProperty({ example: 'Dưỡng ẩm' })
  name: string;

  @ApiProperty({ example: 12 })
  productCount: number;
}
