import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsArray,
  ValidateNested,
  IsNumber,
  Min,
  IsOptional,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  ReturnChannel,
  ReturnReasonCode,
} from '../../domain/entities/return-policy.entity';

export class ReturnItemSubmissionDto {
  @IsString()
  @IsNotEmpty()
  orderItemId: string;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsEnum(ReturnReasonCode)
  @IsNotEmpty()
  reasonCode: ReturnReasonCode;

  @IsOptional()
  @IsString()
  customerNote?: string;

  @IsArray()
  @ArrayMinSize(1, {
    message: 'Mỗi sản phẩm hoàn trả phải có ít nhất 1 hình ảnh bằng chứng',
  })
  @IsString({ each: true })
  evidenceImages: string[];

  @IsOptional()
  @IsString()
  evidenceVideoUrl?: string;
}

export class SubmitReturnRequestDto {
  @IsString()
  @IsNotEmpty()
  orderId: string;

  @IsEnum(ReturnChannel)
  @IsNotEmpty()
  returnChannel: ReturnChannel;

  @IsOptional()
  @IsString()
  dropoffLocationId?: string;

  @IsOptional()
  pickupAddress?: Record<string, any>;

  @IsOptional()
  @IsString()
  customerNote?: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'Hồ sơ đổi trả phải chứa ít nhất 1 sản phẩm' })
  @ValidateNested({ each: true })
  @Type(() => ReturnItemSubmissionDto)
  items: ReturnItemSubmissionDto[];
}
