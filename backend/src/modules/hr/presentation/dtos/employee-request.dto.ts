import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsEmail,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { PageOptionsDto } from '@core/common/pagination.dto';
import { EMPLOYEE_STATUSES } from '../../domain/entities/employee.entity';

const PHONE_MESSAGE = 'Số điện thoại không hợp lệ (10-11 chữ số)';
// employees.salary là Decimal(12,2)
const MAX_SALARY = 9_999_999_999.99;

export class GetEmployeesQueryDto extends PageOptionsDto {
  @ApiPropertyOptional({ description: 'Tìm theo mã nhân viên, họ tên hoặc email' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  readonly search?: string;

  @ApiPropertyOptional({ description: 'Lọc theo cửa hàng làm việc chính' })
  @IsOptional()
  @IsUUID('all', { message: 'storeId không hợp lệ' })
  readonly storeId?: string;

  @ApiPropertyOptional({ description: 'Lọc theo phòng ban' })
  @IsOptional()
  @IsUUID('all', { message: 'departmentId không hợp lệ' })
  readonly departmentId?: string;

  @ApiPropertyOptional({ enum: EMPLOYEE_STATUSES })
  @IsOptional()
  @IsIn(EMPLOYEE_STATUSES as unknown as string[], { message: 'Trạng thái nhân viên không hợp lệ' })
  readonly status?: string;
}

export class CreateEmployeeRequestDto {
  @ApiProperty({ example: 'thungan@glowup.local' })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @MaxLength(255)
  email: string;

  @ApiProperty({ example: 'Trần Thị Bích' })
  @IsString()
  @MinLength(2, { message: 'Họ tên quá ngắn' })
  @MaxLength(100)
  fullName: string;

  @ApiPropertyOptional({ example: '0905123456' })
  @IsOptional()
  @Matches(/^[0-9]{10,11}$/, { message: PHONE_MESSAGE })
  phone?: string;

  @ApiProperty({ example: 3, description: 'Id vai trò đăng nhập (xem GET /admin/roles)' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  roleId: number;

  @ApiProperty({ example: 'Thu ngân' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  position: string;

  @ApiProperty({ example: '2026-10-01' })
  @Type(() => Date)
  @IsDate({ message: 'Ngày vào làm không hợp lệ' })
  hireDate: Date;

  @ApiPropertyOptional({ example: 'NV010', description: 'Bỏ trống để hệ thống tự sinh' })
  @IsOptional()
  @Matches(/^[A-Za-z0-9-]{2,20}$/, { message: 'Mã nhân viên chỉ gồm chữ, số, dấu gạch ngang (2-20 ký tự)' })
  employeeCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('all', { message: 'departmentId không hợp lệ' })
  departmentId?: string;

  @ApiPropertyOptional({ description: 'Cửa hàng làm việc chính, cũng được thêm vào danh sách cửa hàng được gán' })
  @IsOptional()
  @IsUUID('all', { message: 'storeId không hợp lệ' })
  storeId?: string;

  @ApiPropertyOptional({ example: 8000000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(MAX_SALARY, { message: 'Lương vượt quá giới hạn cho phép' })
  salary?: number;

  @ApiPropertyOptional({ example: 2, description: 'Phần trăm hoa hồng, 0-100' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  commissionRate?: number;
}

export class UpdateEmployeeRequestDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Họ tên quá ngắn' })
  @MaxLength(100)
  fullName?: string;

  @ApiPropertyOptional({ description: 'Gửi chuỗi rỗng để xóa số điện thoại' })
  @IsOptional()
  @Matches(/^([0-9]{10,11})?$/, { message: PHONE_MESSAGE })
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  position?: string;

  @ApiPropertyOptional({ nullable: true, description: 'null để bỏ phòng ban' })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUUID('all', { message: 'departmentId không hợp lệ' })
  departmentId?: string | null;

  @ApiPropertyOptional({ nullable: true, description: 'Đổi cửa hàng chính; cửa hàng cũ vẫn giữ trong danh sách được gán' })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUUID('all', { message: 'storeId không hợp lệ' })
  storeId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'Ngày vào làm không hợp lệ' })
  hireDate?: Date;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(MAX_SALARY, { message: 'Lương vượt quá giới hạn cho phép' })
  salary?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  commissionRate?: number;

  @ApiPropertyOptional({ enum: EMPLOYEE_STATUSES, description: 'RESIGNED sẽ khóa tài khoản và thu hồi phiên đăng nhập' })
  @IsOptional()
  @IsIn(EMPLOYEE_STATUSES as unknown as string[], { message: 'Trạng thái nhân viên không hợp lệ' })
  status?: string;
}
