import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional()
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  fullName?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Matches(/^0\d{9}$/, {
    message: 'Sá»‘ Ä‘iá»‡n thoáº¡i Viá»‡t Nam gá»“m 10 chá»¯ sá»‘',
  })
  phone?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(2048)
  avatarUrl?: string | null;

  @ApiPropertyOptional({ nullable: true, format: 'date' })
  @IsOptional()
  @IsDateString({ strict: true })
  dateOfBirth?: string | null;

  @ApiPropertyOptional({ enum: ['MALE', 'FEMALE', 'OTHER'], nullable: true })
  @IsOptional()
  @IsIn(['MALE', 'FEMALE', 'OTHER'])
  gender?: string | null;
}
