import { ApiProperty } from '@nestjs/swagger';

export class UploadImageResponseDto {
  @ApiProperty({
    example:
      'https://abcd1234.supabase.co/storage/v1/object/public/glowup-images/products/0b6f2c1e-7d0a-4a4e-9a57-3f1c2b9d8e10.webp',
  })
  url: string;

  constructor(url: string) {
    this.url = url;
  }
}
