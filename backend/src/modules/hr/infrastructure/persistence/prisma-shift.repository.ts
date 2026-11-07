import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { ShiftView } from '../../domain/entities/shift.entity';
import {
  IShiftRepository,
  ShiftData,
  ShiftListFilter,
} from '../../domain/repositories/shift.repository.interface';

const INCLUDE = { store: { select: { name: true } } } satisfies Prisma.ShiftInclude;
type Row = Prisma.ShiftGetPayload<{ include: typeof INCLUDE }>;

const toView = (row: Row): ShiftView => ({
  id: row.id,
  storeId: row.storeId,
  storeName: row.store?.name ?? null,
  name: row.name,
  startTime: row.startTime,
  endTime: row.endTime,
});

@Injectable()
export class PrismaShiftRepository implements IShiftRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filter: ShiftListFilter): Promise<ShiftView[]> {
    const where: Prisma.ShiftWhereInput = {};
    if (filter.storeId) {
      where.storeId = filter.storeId;
    } else if (filter.storeIds) {
      where.OR = [{ storeId: { in: filter.storeIds } }, { storeId: null }];
    }
    const rows = await this.prisma.shift.findMany({
      where,
      include: INCLUDE,
      orderBy: [{ storeId: 'asc' }, { startTime: 'asc' }],
    });
    return rows.map(toView);
  }

  async findById(id: string): Promise<ShiftView | null> {
    const row = await this.prisma.shift.findUnique({ where: { id }, include: INCLUDE });
    return row ? toView(row) : null;
  }

  async storeExists(id: string): Promise<boolean> {
    return (await this.prisma.store.count({ where: { id } })) > 0;
  }

  async create(data: ShiftData): Promise<ShiftView> {
    return toView(await this.prisma.shift.create({ data, include: INCLUDE }));
  }

  async update(id: string, data: Partial<Omit<ShiftData, 'storeId'>>): Promise<ShiftView> {
    return toView(await this.prisma.shift.update({ where: { id }, data, include: INCLUDE }));
  }

  countAttendance(id: string): Promise<number> {
    return this.prisma.attendance.count({ where: { shiftId: id } });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.shift.delete({ where: { id } });
  }
}
