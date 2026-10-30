import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EmployeeView } from '../../domain/entities/employee.entity';

export class EmployeeResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() userId: string;
  @ApiProperty({ example: 'NV001' }) employeeCode: string;
  @ApiProperty() fullName: string;
  @ApiProperty() email: string;
  @ApiPropertyOptional() phone: string | null;
  @ApiProperty() roleId: number;
  @ApiProperty() roleName: string;
  @ApiProperty({ example: 'ACTIVE', description: 'Trạng thái tài khoản đăng nhập' }) userStatus: string;
  @ApiProperty() position: string;
  @ApiPropertyOptional() departmentId: string | null;
  @ApiPropertyOptional() departmentName: string | null;
  @ApiPropertyOptional() storeId: string | null;
  @ApiPropertyOptional() storeName: string | null;
  @ApiProperty() hireDate: Date;
  @ApiPropertyOptional() salary: number | null;
  @ApiProperty({ example: 2 }) commissionRate: number;
  @ApiProperty({ example: 'ACTIVE' }) status: string;

  static fromDomain(employee: EmployeeView): EmployeeResponseDto {
    return { ...employee };
  }
}

export class CreateEmployeeResponseDto {
  @ApiProperty({ type: EmployeeResponseDto }) employee: EmployeeResponseDto;
  @ApiProperty({ description: 'false nếu gửi thư thất bại: nhân viên vẫn được tạo' })
  activationEmailSent: boolean;
}
