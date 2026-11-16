import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ShippingQuoteItemDto {
  @IsString()
  @IsNotEmpty()
  variantId!: string;

  @IsNumber()
  @Min(1)
  quantity!: number;
}

export class ShippingAddressDto {
  @IsString()
  @IsNotEmpty()
  provinceCity!: string;

  @IsString()
  @IsNotEmpty()
  district!: string;

  @IsString()
  @IsOptional()
  ward?: string;

  @IsString()
  @IsOptional()
  addressLine?: string;

  @IsNumber()
  @IsOptional()
  latitude?: number;

  @IsNumber()
  @IsOptional()
  longitude?: number;
}

export class CalculateShippingQuoteDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ShippingQuoteItemDto)
  items!: ShippingQuoteItemDto[];

  @ValidateNested()
  @Type(() => ShippingAddressDto)
  shippingAddress!: ShippingAddressDto;

  @IsString()
  @IsOptional()
  orderType?: string;
}

export interface ShippingQuoteOption {
  id?: string;
  carrierCode: 'AHAMOVE' | 'GHN';
  serviceCode: 'EXPRESS_2H' | 'STANDARD';
  serviceName: string;
  sourceLocationId: string;
  sourceLocationName: string;
  estimatedFee: number;
  estimatedDeliveryTime: Date;
  distanceKm?: number;
  isAvailable: boolean;
  unavailableReason?: string;
}

export interface ShippingQuoteResponseDto {
  quoteGroupId: string;
  expiresAt: Date;
  options: ShippingQuoteOption[];
}
