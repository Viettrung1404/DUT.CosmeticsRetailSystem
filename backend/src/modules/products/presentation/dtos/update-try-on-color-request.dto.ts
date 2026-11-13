import { ApiProperty } from '@nestjs/swagger';
import { Matches } from 'class-validator';

export class UpdateTryOnColorRequestDto {
  @ApiProperty({ example: '#B9465E', description: 'Mã màu được duyệt từ ảnh swatch của biến thể' })
  @Matches(/^#[0-9A-Fa-f]{6}$/)
  colorHex: string;
}
