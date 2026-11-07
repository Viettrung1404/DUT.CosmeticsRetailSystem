import { ConflictException, ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { startOfVnToday } from '@core/utils/expiry-policy.util';
import { AttendanceRecord, AttendanceView } from '../../domain/entities/attendance.entity';
import {
  ATTENDANCE_REPOSITORY,
  IAttendanceRepository,
} from '../../domain/repositories/attendance.repository.interface';
import { toMinutes, vnMinutesOfDay } from '../utils/vn-time.util';

export const LATE_AFTER_MINUTES = 15;

// Trễ quá 15 phút so với giờ bắt đầu ca thì LATE
@Injectable()
export class CheckInUseCase {
  constructor(@Inject(ATTENDANCE_REPOSITORY) private readonly repository: IAttendanceRepository) {}

  async execute(userId: string, now: Date = new Date()): Promise<AttendanceView> {
    const employee = await this.repository.findEmployeeByUserId(userId);
    if (!employee) throw new ForbiddenException('Tài khoản này không có hồ sơ nhân viên');
    if (employee.status !== 'ACTIVE') {
      throw new ForbiddenException('Hồ sơ nhân viên không ở trạng thái đang làm việc');
    }

    const date = startOfVnToday(now);
    const rows = await this.repository.findRecordsOfDay(employee.id, date);
    if (rows.some((r) => r.checkInAt && !r.checkOutAt)) {
      throw new ConflictException('Bạn đã chấm công vào, hãy chấm công ra trước');
    }

    // Dòng đã phân ca nhưng chưa chấm là "lịch"; chọn ca có giờ bắt đầu gần giờ hiện tại nhất
    const planned = rows.filter((r) => !r.checkInAt);
    if (planned.length === 0) {
      if (rows.length > 0) throw new ConflictException('Hôm nay bạn đã chấm công đủ');
      const id = await this.repository.createCheckedIn(employee.id, date, now, 'PRESENT');
      return this.load(id);
    }

    const minutes = vnMinutesOfDay(now);
    const target = this.nearest(planned, minutes);
    const late = target.shiftStart !== null && minutes - toMinutes(target.shiftStart) > LATE_AFTER_MINUTES;
    if (!(await this.repository.fillCheckIn(target.id, now, late ? 'LATE' : 'PRESENT'))) {
      throw new ConflictException('Bạn đã chấm công vào ca này rồi');
    }
    return this.load(target.id);
  }

  private nearest(rows: AttendanceRecord[], minutes: number): AttendanceRecord {
    const distance = (r: AttendanceRecord) =>
      r.shiftStart === null ? 0 : Math.abs(minutes - toMinutes(r.shiftStart));
    return rows.reduce((best, r) => (distance(r) < distance(best) ? r : best));
  }

  private async load(id: string): Promise<AttendanceView> {
    return (await this.repository.findById(id)) as AttendanceView;
  }
}
