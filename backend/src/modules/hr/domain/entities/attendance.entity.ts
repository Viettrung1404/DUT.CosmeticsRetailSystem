export const ATTENDANCE_STATUSES = ['PRESENT', 'LATE', 'ABSENT'] as const;

export interface AttendanceView {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  storeId: string | null;
  storeName: string | null;
  shiftId: string | null;
  shiftName: string | null;
  date: Date;
  checkInAt: Date | null;
  checkOutAt: Date | null;
  status: string | null;
  note: string | null;
}

// Dòng chấm công hôm nay của một nhân viên, kèm giờ ca để tính đi muộn
export interface AttendanceRecord {
  id: string;
  shiftStart: string | null;
  checkInAt: Date | null;
  checkOutAt: Date | null;
}

export interface AttendanceEmployee {
  id: string;
  storeId: string | null;
  status: string;
}
