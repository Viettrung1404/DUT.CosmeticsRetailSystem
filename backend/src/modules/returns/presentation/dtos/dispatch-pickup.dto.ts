import { IsOptional, IsString, IsNumber, Min } from 'class-validator';

export class DispatchReturnPickupDto {
  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsNumber()
  @Min(50)
  estimatedWeightGrams?: number;

  @IsOptional()
  @IsString()
  destinationWarehouseId?: string;
}
