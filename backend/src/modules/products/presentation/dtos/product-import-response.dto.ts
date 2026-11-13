import { ApiProperty } from '@nestjs/swagger';

class ImportCountDto {
  @ApiProperty({ example: 2 })
  create: number;

  @ApiProperty({ example: 1 })
  update: number;
}

export class ImportSummaryDto {
  @ApiProperty({ type: ImportCountDto })
  products: ImportCountDto;

  @ApiProperty({ type: ImportCountDto })
  variants: ImportCountDto;
}

export class ImportErrorDto {
  @ApiProperty({ example: 5 })
  row: number;

  @ApiProperty({ example: 'price' })
  column: string;

  @ApiProperty({ example: 'Giá bán phải là số nguyên dương' })
  message: string;
}

export class ImportProductsResponseDto {
  @ApiProperty({ example: true })
  dryRun: boolean;

  @ApiProperty({ example: true })
  valid: boolean;

  @ApiProperty({ example: false })
  imported: boolean;

  @ApiProperty({ type: ImportSummaryDto })
  summary: ImportSummaryDto;

  @ApiProperty({ example: 0 })
  errorCount: number;

  @ApiProperty({ type: [ImportErrorDto] })
  errors: ImportErrorDto[];
}
