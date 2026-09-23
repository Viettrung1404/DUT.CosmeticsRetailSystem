import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProductSuggestionDto {
  @ApiProperty({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  id: string;

  @ApiProperty({ example: 'Son kem lì Black Rouge Air Fit Velvet Tint' })
  name: string;

  @ApiProperty({ example: 'son-kem-li-black-rouge-air-fit-velvet-tint' })
  slug: string;

  @ApiPropertyOptional({ example: 'https://example.com/product.jpg' })
  imageUrl?: string | null;

  @ApiProperty({ example: 179000 })
  price: number;
}
