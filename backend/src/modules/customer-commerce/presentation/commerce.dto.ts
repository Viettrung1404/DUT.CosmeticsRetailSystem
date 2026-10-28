import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  Matches,
  ValidateNested,
} from 'class-validator';
import { PageOptionsDto } from '@core/common/pagination.dto';

export class ReturnItemDto {
  @ApiProperty() @IsUUID() orderItemId: string;
  @ApiProperty({ minimum: 1 }) @IsInt() @Min(1) @Max(10000) quantity: number;
}
export class ExchangeItemDto {
  @ApiProperty() @IsUUID() productVariantId: string;
  @ApiProperty({ minimum: 1 }) @IsInt() @Min(1) @Max(10000) quantity: number;
}
export const RETURN_REASONS = [
  'WRONG_ITEM',
  'DEFECTIVE',
  'EXPIRED',
  'ALLERGIC',
  'CUSTOMER_CHANGE_MIND',
];
export class CreateReturnDto {
  @ApiProperty() @IsUUID() orderId: string;
  @ApiProperty({ enum: ['REFUND', 'EXCHANGE'] })
  @IsIn(['REFUND', 'EXCHANGE'])
  type: 'REFUND' | 'EXCHANGE';
  @ApiProperty({ enum: RETURN_REASONS }) @IsIn(RETURN_REASONS) reason: string;
  @ApiProperty({ type: [ReturnItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ArrayUnique((item: ReturnItemDto) => item.orderItemId)
  @ValidateNested({ each: true })
  @Type(() => ReturnItemDto)
  items: ReturnItemDto[];
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @ArrayUnique()
  @IsUUID('all', { each: true })
  attachmentIds?: string[];
  @ApiPropertyOptional({ type: [ExchangeItemDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ArrayUnique((item: ExchangeItemDto) => item.productVariantId)
  @ValidateNested({ each: true })
  @Type(() => ExchangeItemDto)
  replacements?: ExchangeItemDto[];
}
export class ReturnQueryDto extends PageOptionsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsIn(['REQUESTED', 'APPROVED', 'RECEIVED', 'INSPECTED', 'COMPLETED', 'REJECTED'])
  status?: string;
}
export class AcceptExchangeDto {
  @ApiProperty() @IsInt() @Min(1) quoteVersion: number;
  @ApiPropertyOptional({ enum: ['COD', 'VNPAY', 'MOMO', 'ZALOPAY'] })
  @IsOptional()
  @IsIn(['COD', 'VNPAY', 'MOMO', 'ZALOPAY'])
  paymentMethod?: string;
}
export class RedeemDto {
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(60) rewardCode: string;
}
export class WishlistDto {
  @ApiProperty() @IsUUID() productId: string;
}
export class WishlistStateDto {
  @ApiProperty()
  @IsBoolean()
  @Transform(({ obj, key }) => obj[key])
  selected: boolean;
}
export class DeviceDto {
  @ApiProperty({
    description:
      'Native FCM registration token, not ExpoPushToken/ExponentPushToken or an APNs token',
  })
  @IsString()
  @MinLength(8)
  @MaxLength(255)
  @Matches(/^(?!(?:ExpoPushToken|ExponentPushToken)\[).+$/, {
    message: 'FCM_REGISTRATION_TOKEN_REQUIRED',
  })
  deviceToken: string;
  @ApiProperty({ enum: ['IOS', 'ANDROID', 'WEB'] })
  @IsIn(['IOS', 'ANDROID', 'WEB'])
  platform: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  deviceName?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  appVersion?: string;
}
