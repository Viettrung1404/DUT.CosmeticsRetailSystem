import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class StartPickingDto {
  @IsString()
  @IsOptional()
  pickerId?: string;

  @IsInt()
  @IsOptional()
  expectedVersion?: number;
}

export class PickedItemDto {
  @IsString()
  @IsNotEmpty()
  variantId!: string;

  @IsString()
  @IsNotEmpty()
  batchCode!: string;

  @IsNumber()
  @Min(1)
  quantity!: number;

  @IsString()
  @IsOptional()
  barcode?: string;
}

export class CompletePickingDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PickedItemDto)
  items!: PickedItemDto[];

  @IsInt()
  @IsOptional()
  expectedVersion?: number;
}

export interface PickListItemDto {
  variantId: string;
  sku: string;
  productName: string;
  barcode?: string | null;
  lotId: string;
  batchCode: string;
  expiryDate: Date;
  quantity: number;
}

export interface PickListResponseDto {
  fulfillmentOrderId: string;
  fulfillmentOrderNumber: string;
  sourceLocationId: string;
  sourceLocationName: string;
  status: string;
  totalItemsCount: number;
  items: PickListItemDto[];
}
