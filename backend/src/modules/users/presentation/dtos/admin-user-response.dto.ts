import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  AdminPermission,
  AdminRole,
  AdminUser,
  AdminUserStore,
} from '../../domain/entities/admin-user.entity';

export class AdminUserResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() email: string;
  @ApiProperty() fullName: string;
  @ApiPropertyOptional() phone: string | null;
  @ApiProperty() roleId: number;
  @ApiProperty() roleName: string;
  @ApiProperty() roleDisplayName: string;
  @ApiProperty({ example: 'ACTIVE' }) status: string;
  @ApiProperty() emailVerified: boolean;
  @ApiProperty({ example: '0', description: 'Mặt nạ quyền cấp thêm (chuỗi số)' })
  extraPermissions: string;
  @ApiProperty({ example: '0', description: 'Mặt nạ quyền thu hồi (chuỗi số)' })
  revokedPermissions: string;
  @ApiPropertyOptional() lastLoginAt: Date | null;
  @ApiProperty() createdAt: Date;
  @ApiProperty({ type: 'array', items: { type: 'object' } }) stores: AdminUserStore[];
  @ApiPropertyOptional() employeeId: string | null;

  static fromDomain(user: AdminUser): AdminUserResponseDto {
    return {
      ...user,
      extraPermissions: user.extraPermissions.toString(),
      revokedPermissions: user.revokedPermissions.toString(),
    };
  }
}

export class CreateAdminUserResponseDto {
  @ApiProperty({ type: AdminUserResponseDto }) user: AdminUserResponseDto;
  @ApiProperty({ description: 'false nếu gửi thư thất bại: tài khoản vẫn được tạo' })
  activationEmailSent: boolean;
}

export class AdminRoleResponseDto {
  @ApiProperty() id: number;
  @ApiProperty() name: string;
  @ApiProperty() displayName: string;
  @ApiPropertyOptional() description: string | null;
  @ApiProperty({ example: '9007199254740991', description: 'Mặt nạ quyền của vai trò (chuỗi số)' })
  permissions: string;
  @ApiProperty({ example: 'STORE' }) dataScope: string;
  @ApiProperty() isSystem: boolean;

  static fromDomain(role: AdminRole): AdminRoleResponseDto {
    return { ...role, permissions: role.permissions.toString() };
  }
}

export class AdminPermissionResponseDto {
  @ApiProperty() bitPosition: number;
  @ApiProperty() permissionCode: string;
  @ApiProperty() permissionName: string;
  @ApiProperty() module: string;

  static fromDomain(permission: AdminPermission): AdminPermissionResponseDto {
    return { ...permission };
  }
}
