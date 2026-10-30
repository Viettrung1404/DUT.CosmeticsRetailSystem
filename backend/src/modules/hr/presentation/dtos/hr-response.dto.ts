import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AttendanceView } from '../../domain/entities/attendance.entity';
import { CommissionSummary, CommissionView } from '../../domain/entities/commission.entity';
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

export class CommissionResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() employeeId: string;
  @ApiProperty() employeeCode: string;
  @ApiProperty() employeeName: string;
  @ApiPropertyOptional() storeId: string | null;
  @ApiProperty() orderId: string;
  @ApiProperty() orderNumber: string;
  @ApiProperty() amount: number;
  @ApiProperty({ description: 'Tỷ lệ % lúc bán' }) rate: number;
  @ApiProperty() periodMonth: number;
  @ApiProperty() periodYear: number;
  @ApiProperty({ description: 'PENDING | PAID (đã chốt) | CANCELLED' }) status: string;
  @ApiProperty() createdAt: Date;

  static fromDomain(c: CommissionView): CommissionResponseDto {
    return Object.assign(new CommissionResponseDto(), c);
  }
}

export class CommissionSummaryResponseDto {
  @ApiProperty() employeeId: string;
  @ApiProperty() employeeCode: string;
  @ApiProperty() employeeName: string;
  @ApiProperty() orderCount: number;
  @ApiProperty({ description: 'Tổng hoa hồng (không tính dòng CANCELLED)' }) totalAmount: number;

  static fromDomain(s: CommissionSummary): CommissionSummaryResponseDto {
    return Object.assign(new CommissionSummaryResponseDto(), s);
  }
}

export class CommissionListResponseDto {
  @ApiProperty({ type: [CommissionResponseDto] }) items: CommissionResponseDto[];
  @ApiProperty({ type: [CommissionSummaryResponseDto], description: 'Tổng theo nhân viên trên toàn bộ kết quả lọc' })
  summary: CommissionSummaryResponseDto[];
  @ApiProperty() meta: object;
}

export class FinalizeCommissionsResponseDto {
  @ApiProperty() month: number;
  @ApiProperty() year: number;
  @ApiProperty({ description: 'Số dòng hoa hồng được đổi PENDING -> PAID' }) finalizedCount: number;
}
