import { IsOptional, IsString, IsNumber, Min } from 'class-validator';

export class ReceiveWarehouseReturnDto {
  @IsOptional()
  @IsString()
  packageConditionNote?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  receivedItemsCount?: number;

  @IsOptional()
  @IsString()
  warehouseId?: string;
}
