import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { DepartmentView } from '../../domain/entities/department.entity';
import {
  DepartmentData,
  IDepartmentRepository,
} from '../../domain/repositories/department.repository.interface';

const INCLUDE = { _count: { select: { employees: true } } } satisfies Prisma.DepartmentInclude;
type Row = Prisma.DepartmentGetPayload<{ include: typeof INCLUDE }>;

const toView = (row: Row): DepartmentView => ({
  id: row.id,
  name: row.name,
  description: row.description,
  employeeCount: row._count.employees,
  createdAt: row.createdAt,
});

@Injectable()
export class PrismaDepartmentRepository implements IDepartmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<DepartmentView[]> {
    const rows = await this.prisma.department.findMany({ include: INCLUDE, orderBy: { name: 'asc' } });
    return rows.map(toView);
  }

  async findById(id: string): Promise<DepartmentView | null> {
    const row = await this.prisma.department.findUnique({ where: { id }, include: INCLUDE });
    return row ? toView(row) : null;
  }

  findByName(name: string): Promise<{ id: string } | null> {
    return this.prisma.department.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
      select: { id: true },
    });
  }

  async create(data: DepartmentData): Promise<DepartmentView> {
    return toView(await this.prisma.department.create({ data, include: INCLUDE }));
  }

  async update(id: string, data: Partial<DepartmentData>): Promise<DepartmentView> {
    return toView(await this.prisma.department.update({ where: { id }, data, include: INCLUDE }));
  }

  countEmployees(id: string): Promise<number> {
    return this.prisma.employee.count({ where: { departmentId: id } });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.department.delete({ where: { id } });
  }
}
