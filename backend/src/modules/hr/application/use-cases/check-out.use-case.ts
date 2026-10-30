import { ConflictException, ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { startOfVnToday } from '@core/utils/expiry-policy.util';
import { AttendanceView } from '../../domain/entities/attendance.entity';
import {
  ATTENDANCE_REPOSITORY,
  IAttendanceRepository,
} from '../../domain/repositories/attendance.repository.interface';

@Injectable()
export class CheckOutUseCase {
  constructor(@Inject(ATTENDANCE_REPOSITORY) private readonly repository: IAttendanceRepository) {}

  async execute(userId: string, now: Date = new Date()): Promise<AttendanceView> {
    const employee = await this.repository.findEmployeeByUserId(userId);
    if (!employee) throw new ForbiddenException('Tài khoản này không có hồ sơ nhân viên');

    const rows = await this.repository.findRecordsOfDay(employee.id, startOfVnToday(now));
    const open = rows.find((r) => r.checkInAt && !r.checkOutAt);
    if (!open) throw new ConflictException('Bạn chưa chấm công vào hôm nay hoặc đã chấm công ra rồi');

    if (!(await this.repository.fillCheckOut(open.id, now))) {
      throw new ConflictException('Bạn đã chấm công ra rồi');
    }
    return (await this.repository.findById(open.id)) as AttendanceView;
  }
}
