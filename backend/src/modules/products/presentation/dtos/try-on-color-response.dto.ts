import { ApiProperty } from '@nestjs/swagger';

export class TryOnColorResponseDto {
  @ApiProperty({ example: 'c3d4e5f6-1a2b-4c3d-8e9f-0a1b2c3d4e5f' })
  id: string;

  @ApiProperty({ example: '#B9465E' })
  tryOnColorHex: string;
}
