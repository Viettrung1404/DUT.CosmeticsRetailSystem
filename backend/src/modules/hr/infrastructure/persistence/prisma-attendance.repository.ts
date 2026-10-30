import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@infrastructure/database/prisma.service';
import {
  AttendanceEmployee,
  AttendanceRecord,
  AttendanceView,
} from '../../domain/entities/attendance.entity';
import {
  AttendanceListFilter,
  IAttendanceRepository,
} from '../../domain/repositories/attendance.repository.interface';

const INCLUDE = {
  employee: {
    select: {
      employeeCode: true,
      storeId: true,
      store: { select: { name: true } },
      user: { select: { fullName: true } },
    },
  },
  shift: { select: { name: true } },
} satisfies Prisma.AttendanceInclude;
type Row = Prisma.AttendanceGetPayload<{ include: typeof INCLUDE }>;

const toView = (row: Row): AttendanceView => ({
  id: row.id,
  employeeId: row.employeeId,
  employeeCode: row.employee.employeeCode,
  employeeName: row.employee.user.fullName,
  storeId: row.employee.storeId,
  storeName: row.employee.store?.name ?? null,
  shiftId: row.shiftId,
  shiftName: row.shift?.name ?? null,
  date: row.date,
  checkInAt: row.checkInAt,
  checkOutAt: row.checkOutAt,
  status: row.status,
  note: row.note,
});

@Injectable()
export class PrismaAttendanceRepository implements IAttendanceRepository {
  constructor(private readonly prisma: PrismaService) {}

  findEmployeeByUserId(userId: string): Promise<AttendanceEmployee | null> {
    return this.prisma.employee.findUnique({
      where: { userId },
      select: { id: true, storeId: true, status: true },
    });
  }

  async findRecordsOfDay(employeeId: string, date: Date): Promise<AttendanceRecord[]> {
    const rows = await this.prisma.attendance.findMany({
      where: { employeeId, date },
      include: { shift: { select: { startTime: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((r) => ({
      id: r.id,
      shiftStart: r.shift?.startTime ?? null,
      checkInAt: r.checkInAt,
      checkOutAt: r.checkOutAt,
    }));
  }

  // Điều kiện checkInAt null chặn hai lần bấm đồng thời cùng điền một dòng
  async fillCheckIn(id: string, at: Date, status: string): Promise<boolean> {
    const result = await this.prisma.attendance.updateMany({
      where: { id, checkInAt: null },
      data: { checkInAt: at, status },
    });
    return result.count === 1;
  }

  async createCheckedIn(employeeId: string, date: Date, at: Date, status: string): Promise<string> {
    const row = await this.prisma.attendance.create({
      data: { employeeId, date, checkInAt: at, status },
      select: { id: true },
    });
    return row.id;
  }

  async fillCheckOut(id: string, at: Date): Promise<boolean> {
    const result = await this.prisma.attendance.updateMany({
      where: { id, checkInAt: { not: null }, checkOutAt: null },
      data: { checkOutAt: at },
    });
    return result.count === 1;
  }

  async findById(id: string): Promise<AttendanceView | null> {
    const row = await this.prisma.attendance.findUnique({ where: { id }, include: INCLUDE });
    return row ? toView(row) : null;
  }

  async findAll(filter: AttendanceListFilter): Promise<{ items: AttendanceView[]; total: number }> {
    const and: Prisma.AttendanceWhereInput[] = [];
    if (filter.employeeId) and.push({ employeeId: filter.employeeId });
    if (filter.storeIds) and.push({ employee: { storeId: { in: filter.storeIds } } });
    if (filter.from) and.push({ date: { gte: filter.from } });
    if (filter.to) and.push({ date: { lte: filter.to } });
    if (filter.status) and.push({ status: filter.status });
    const where: Prisma.AttendanceWhereInput = { AND: and };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.attendance.findMany({
        where,
        include: INCLUDE,
        orderBy: [{ date: filter.order }, { checkInAt: filter.order }],
        skip: filter.skip,
        take: filter.take,
      }),
      this.prisma.attendance.count({ where }),
    ]);
    return { items: rows.map(toView), total };
  }
}
