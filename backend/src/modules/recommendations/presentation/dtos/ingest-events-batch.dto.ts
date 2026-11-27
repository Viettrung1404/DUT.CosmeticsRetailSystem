import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RecommendationPlacement } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
  ValidateIf,
} from 'class-validator';
import {
  CLIENT_ALLOWED_BEHAVIOR_EVENT_TYPES,
  ClientAllowedBehaviorEventType,
} from '../../domain/behavior-weight.policy';

export type ClientBehaviorEventType = ClientAllowedBehaviorEventType;

export class ClientBehaviorEventDto {
  @ApiProperty({
    format: 'uuid',
    description: 'Client-generated UUID v4 cho idempotency',
  })
  @IsUUID('4')
  id!: string;

  @ApiProperty({ enum: CLIENT_ALLOWED_BEHAVIOR_EVENT_TYPES })
  @IsIn(CLIENT_ALLOWED_BEHAVIOR_EVENT_TYPES)
  eventType!: ClientBehaviorEventType;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  productId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  variantId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  brandId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(60)
  source?: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class PlacementImpressionDto {
  @ApiProperty({ enum: RecommendationPlacement })
  @IsEnum(RecommendationPlacement)
  placement!: RecommendationPlacement;

  @ApiProperty({ minimum: 1, maximum: 1000 })
  @IsInt()
  @Min(1)
  @Max(1000)
  count!: number;
}

/**
 * Payload public từ Web/Mobile client.
 * Tuyệt đối không khai báo `customerId` để ValidationPipe (whitelist + forbidNonWhitelisted) chặn giả mạo.
 */
export class IngestEventsBatchDto {
  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Stable ID reused when retrying a batch',
  })
  @ValidateIf(
    (batch) =>
      batch.batchId !== undefined ||
      (Boolean(batch.impressions?.length) && !batch.events?.length),
  )
  @IsUUID('4')
  batchId?: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  anonymousId!: string;

  @ApiProperty({ type: [ClientBehaviorEventDto], maxItems: 50 })
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => ClientBehaviorEventDto)
  events!: ClientBehaviorEventDto[];

  @ApiPropertyOptional({ type: [PlacementImpressionDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => PlacementImpressionDto)
  impressions?: PlacementImpressionDto[];
}

export class InternalBehaviorEnvelopeDto {
  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Stable ID reused when retrying a batch',
  })
  @ValidateIf(
    (batch) =>
      batch.batchId !== undefined ||
      (Boolean(batch.impressions?.length) && !batch.events?.length),
  )
  @IsUUID('4')
  batchId?: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  anonymousId!: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  customerId?: string | null;

  @ApiPropertyOptional({
    format: 'uuid',
    nullable: true,
    description: 'userId trích từ NestJS JWT ở Cloudflare Worker Edge',
  })
  @IsOptional()
  @IsUUID()
  userId?: string | null;

  @ApiProperty({ type: [ClientBehaviorEventDto], maxItems: 50 })
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => ClientBehaviorEventDto)
  events!: ClientBehaviorEventDto[];

  @ApiPropertyOptional({ type: [PlacementImpressionDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => PlacementImpressionDto)
  impressions?: PlacementImpressionDto[];
}

/**
 * Payload nội bộ từ Cloudflare Worker Consumer (đã verify JWT ở Edge và gộp batch).
 */
export class InternalIngestEventsBatchDto {
  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Stable ID reused when retrying a batch',
  })
  @IsOptional()
  @IsUUID('4')
  batchId?: string;

  @ApiPropertyOptional({ type: [InternalBehaviorEnvelopeDto], maxItems: 15 })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(15)
  @ValidateNested({ each: true })
  @Type(() => InternalBehaviorEnvelopeDto)
  batches?: InternalBehaviorEnvelopeDto[];

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  anonymousId?: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  customerId?: string | null;

  @ApiPropertyOptional({
    format: 'uuid',
    nullable: true,
    description: 'userId trích từ NestJS JWT ở Cloudflare Worker Edge',
  })
  @IsOptional()
  @IsUUID()
  userId?: string | null;

  @ApiPropertyOptional({ type: [ClientBehaviorEventDto], maxItems: 50 })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => ClientBehaviorEventDto)
  events?: ClientBehaviorEventDto[];

  @ApiPropertyOptional({ type: [PlacementImpressionDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => PlacementImpressionDto)
  impressions?: PlacementImpressionDto[];
}
