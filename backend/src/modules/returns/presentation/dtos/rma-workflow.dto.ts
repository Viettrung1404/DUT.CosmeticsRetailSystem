import { IsOptional, IsNumber, Min, IsString } from 'class-validator';

export class ExpireStaleRmaDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  thresholdDays?: number = 7;
}

export class CheckQcSlaDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  thresholdHours?: number = 48;
}

export class HandleLostPackageDto {
  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  claimAmount?: number;
}
