import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AttendanceView } from '../../domain/entities/attendance.entity';
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

export class AttendanceResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() employeeId: string;
  @ApiProperty() employeeCode: string;
  @ApiProperty() employeeName: string;
  @ApiPropertyOptional() storeId: string | null;
  @ApiPropertyOptional() storeName: string | null;
  @ApiPropertyOptional() shiftId: string | null;
  @ApiPropertyOptional() shiftName: string | null;
  @ApiProperty({ example: '2026-10-23', description: 'Ngày công theo giờ Việt Nam' }) date: string;
  @ApiPropertyOptional() checkInAt: Date | null;
  @ApiPropertyOptional() checkOutAt: Date | null;
  @ApiPropertyOptional({ description: 'PRESENT | LATE | ABSENT; null = đã phân ca nhưng chưa chấm' })
  status: string | null;
  @ApiPropertyOptional() note: string | null;

  static fromDomain(a: AttendanceView): AttendanceResponseDto {
    return Object.assign(new AttendanceResponseDto(), a, { date: a.date.toISOString().slice(0, 10) });
  }
}

