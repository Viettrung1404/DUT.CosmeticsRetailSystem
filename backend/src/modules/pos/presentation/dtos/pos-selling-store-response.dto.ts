import { ApiProperty } from '@nestjs/swagger';

export class PosSellingStoreResponseDto {
  @ApiProperty({ example: 'c0ffee00-0000-4000-8000-000000000003' })
  id: string;

  @ApiProperty({ example: 'CH01' })
  code: string;

  @ApiProperty({ example: 'CH01 - Quận Hải Châu' })
  name: string;
}
