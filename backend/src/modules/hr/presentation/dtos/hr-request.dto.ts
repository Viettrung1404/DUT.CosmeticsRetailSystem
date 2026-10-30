import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { PageOptionsDto } from '@core/common/pagination.dto';
import { ATTENDANCE_STATUSES } from '../../domain/entities/attendance.entity';

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;
const TIME_MESSAGE = 'Giờ phải có dạng HH:mm (ví dụ 08:00)';
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const DATE_MESSAGE = 'Ngày phải có dạng YYYY-MM-DD';

export class CreateDepartmentRequestDto {
  @ApiProperty({ example: 'Bán hàng' })
  @IsString()
  @IsNotEmpty({ message: 'Tên phòng ban không được để trống' })
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}

export class UpdateDepartmentRequestDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Tên phòng ban không được để trống' })
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}

export class GetShiftsQueryDto {
  @ApiPropertyOptional({ description: 'Lọc theo cửa hàng (ca dùng chung không thuộc cửa hàng nào không hiện khi lọc)' })
  @IsOptional()
  @IsUUID('all', { message: 'storeId không hợp lệ' })
  readonly storeId?: string;
}

export class CreateShiftRequestDto {
  @ApiPropertyOptional({ description: 'Bỏ trống = ca dùng chung toàn chuỗi (chỉ phạm vi ALL)' })
  @IsOptional()
  @IsUUID('all', { message: 'storeId không hợp lệ' })
  storeId?: string;

  @ApiProperty({ example: 'Ca sáng' })
  @IsString()
  @IsNotEmpty({ message: 'Tên ca không được để trống' })
  @MaxLength(50)
  name: string;

  @ApiProperty({ example: '08:00' })
  @Matches(TIME_REGEX, { message: TIME_MESSAGE })
  startTime: string;

  @ApiProperty({ example: '12:00' })
  @Matches(TIME_REGEX, { message: TIME_MESSAGE })
  endTime: string;
}

export class UpdateShiftRequestDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Tên ca không được để trống' })
  @MaxLength(50)
  name?: string;

  @ApiPropertyOptional({ example: '08:00' })
  @IsOptional()
  @Matches(TIME_REGEX, { message: TIME_MESSAGE })
  startTime?: string;

  @ApiPropertyOptional({ example: '12:00' })
  @IsOptional()
  @Matches(TIME_REGEX, { message: TIME_MESSAGE })
  endTime?: string;
}

export class GetAttendanceQueryDto extends PageOptionsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('all', { message: 'employeeId không hợp lệ' })
  readonly employeeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('all', { message: 'storeId không hợp lệ' })
  readonly storeId?: string;

  @ApiPropertyOptional({ example: '2026-10-01' })
  @IsOptional()
  @Matches(DATE_REGEX, { message: DATE_MESSAGE })
  readonly from?: string;

  @ApiPropertyOptional({ example: '2026-10-31' })
  @IsOptional()
  @Matches(DATE_REGEX, { message: DATE_MESSAGE })
  readonly to?: string;

  @ApiPropertyOptional({ enum: ATTENDANCE_STATUSES })
  @IsOptional()
  @IsIn(ATTENDANCE_STATUSES as unknown as string[], { message: 'Trạng thái chấm công không hợp lệ' })
  readonly status?: string;
}

