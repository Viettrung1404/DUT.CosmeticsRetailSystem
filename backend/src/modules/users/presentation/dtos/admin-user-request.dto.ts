import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { PageOptionsDto } from '@core/common/pagination.dto';
import { USER_STATUSES } from '../../domain/entities/admin-user.entity';

const PHONE_RULE = /^[0-9]{10,11}$/;
const PHONE_MESSAGE = 'Số điện thoại không hợp lệ (10-11 chữ số)';
const MASK_RULE = /^[0-9]{1,19}$/;
const MASK_MESSAGE = 'Mặt nạ quyền phải là chuỗi số nguyên không âm';

export class GetAdminUsersQueryDto extends PageOptionsDto {
  @ApiPropertyOptional({ description: 'Tìm theo họ tên, email hoặc số điện thoại' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  readonly search?: string;

  @ApiPropertyOptional({ description: 'Lọc theo vai trò (id)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  readonly roleId?: number;

  @ApiPropertyOptional({ enum: USER_STATUSES })
  @IsOptional()
  @IsIn(USER_STATUSES as unknown as string[], { message: 'Trạng thái không hợp lệ' })
  readonly status?: string;

  @ApiPropertyOptional({ description: 'Lọc theo cửa hàng được gán' })
  @IsOptional()
  @IsUUID('all', { message: 'storeId không hợp lệ' })
  readonly storeId?: string;
}

export class CreateAdminUserRequestDto {
  @ApiProperty({ example: 'nhanvien@glowup.local' })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @MaxLength(255)
  email: string;

  @ApiProperty({ example: 'Nguyễn Văn An' })
  @IsString()
  @MinLength(2, { message: 'Họ tên quá ngắn' })
  @MaxLength(100)
  fullName: string;

  @ApiPropertyOptional({ example: '0905123456' })
  @IsOptional()
  @Matches(PHONE_RULE, { message: PHONE_MESSAGE })
  phone?: string;

  @ApiProperty({ example: 3, description: 'Id vai trò (xem GET /admin/roles)' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  roleId: number;

  @ApiPropertyOptional({ type: [String], description: 'Các cửa hàng được gán' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsUUID('all', { each: true, message: 'storeIds chứa giá trị không hợp lệ' })
  storeIds?: string[];
}

export class UpdateAdminUserRequestDto {
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

  @ApiPropertyOptional({ description: 'Đổi vai trò' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  roleId?: number;

  @ApiPropertyOptional({ enum: USER_STATUSES, description: 'INACTIVE/BANNED sẽ thu hồi phiên đăng nhập' })
  @IsOptional()
  @IsIn(USER_STATUSES as unknown as string[], { message: 'Trạng thái không hợp lệ' })
  status?: string;
}

export class SetUserPermissionsRequestDto {
  @ApiPropertyOptional({
    example: '1024',
    description: 'Mặt nạ bit quyền cấp thêm (số nguyên dạng chuỗi, bit n = 2^n)',
  })
  @IsOptional()
  @Matches(MASK_RULE, { message: MASK_MESSAGE })
  extraPermissions?: string;

  @ApiPropertyOptional({ example: '0', description: 'Mặt nạ bit quyền thu hồi' })
  @IsOptional()
  @Matches(MASK_RULE, { message: MASK_MESSAGE })
  revokedPermissions?: string;
}

export class SetUserStoresRequestDto {
  @ApiProperty({ type: [String], description: 'Danh sách đầy đủ cửa hàng sau khi sửa; mảng rỗng là gỡ hết' })
  @IsArray()
  @ArrayMaxSize(50)
  @IsUUID('all', { each: true, message: 'storeIds chứa giá trị không hợp lệ' })
  storeIds: string[];
}
