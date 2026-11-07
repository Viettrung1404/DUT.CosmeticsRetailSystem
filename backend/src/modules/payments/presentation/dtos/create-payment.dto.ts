import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsUUID } from 'class-validator';

export class CreatePaymentDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  orderId: string;

  @ApiPropertyOptional({ enum: ['WEB', 'MOBILE'], default: 'WEB' })
  @IsOptional()
  @IsIn(['WEB', 'MOBILE'])
  platform?: string;
}
