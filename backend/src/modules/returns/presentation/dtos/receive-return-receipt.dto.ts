import { IsOptional, IsString, IsNumber, Min } from 'class-validator';

export class ReceiveStoreDropoffDto {
  @IsOptional()
  @IsString()
  packageConditionNote?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  receivedItemsCount?: number;
}
