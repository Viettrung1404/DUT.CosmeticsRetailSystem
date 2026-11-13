import { ApiProperty } from '@nestjs/swagger';

export class CustomerTagSummaryDto {
  @ApiProperty({ example: 'VIP' })
  tag: string;

  @ApiProperty({ example: 14 })
  customers: number;
}

export class ReplaceCustomerTagsResponseDto {
  @ApiProperty({ example: 'c3d4e5f6-1a2b-4c3d-8e9f-0a1b2c3d4e5f' })
  customerId: string;

  @ApiProperty({ type: [String], example: ['VIP', 'Hay mua mỹ phẩm'] })
  tags: string[];
}
