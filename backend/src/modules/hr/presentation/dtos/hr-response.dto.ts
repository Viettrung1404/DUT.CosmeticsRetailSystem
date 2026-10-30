import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DepartmentView } from '../../domain/entities/department.entity';
import { ShiftView } from '../../domain/entities/shift.entity';

export class DepartmentResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiPropertyOptional() description: string | null;
  @ApiProperty() employeeCount: number;
  @ApiProperty() createdAt: Date;

  static fromDomain(d: DepartmentView): DepartmentResponseDto {
    return Object.assign(new DepartmentResponseDto(), d);
  }
}

export class ShiftResponseDto {
  @ApiProperty() id: string;
  @ApiPropertyOptional({ description: 'null = ca dùng chung toàn chuỗi' }) storeId: string | null;
  @ApiPropertyOptional() storeName: string | null;
  @ApiProperty() name: string;
  @ApiProperty({ example: '08:00' }) startTime: string;
  @ApiProperty({ example: '12:00' }) endTime: string;

  static fromDomain(s: ShiftView): ShiftResponseDto {
    return Object.assign(new ShiftResponseDto(), s);
  }
}

