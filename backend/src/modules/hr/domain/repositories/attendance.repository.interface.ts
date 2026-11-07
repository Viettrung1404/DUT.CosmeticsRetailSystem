import {
  AttendanceEmployee,
  AttendanceRecord,
  AttendanceView,
} from '../entities/attendance.entity';

export const ATTENDANCE_REPOSITORY = Symbol('IAttendanceRepository');

export interface AttendanceListFilter {
  skip: number;
  take: number;
  order: 'asc' | 'desc';
  employeeId?: string;
  storeIds?: string[];
  from?: Date;
  to?: Date;
  status?: string;
}

export interface IAttendanceRepository {
  findEmployeeByUserId(userId: string): Promise<AttendanceEmployee | null>;
  findRecordsOfDay(employeeId: string, date: Date): Promise<AttendanceRecord[]>;
  fillCheckIn(id: string, at: Date, status: string): Promise<boolean>;
  createCheckedIn(employeeId: string, date: Date, at: Date, status: string): Promise<string>;
  fillCheckOut(id: string, at: Date): Promise<boolean>;
  findById(id: string): Promise<AttendanceView | null>;
  findAll(filter: AttendanceListFilter): Promise<{ items: AttendanceView[]; total: number }>;
}
