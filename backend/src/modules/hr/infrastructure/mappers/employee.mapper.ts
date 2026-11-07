import { Prisma } from '@prisma/client';
import { EmployeeView } from '../../domain/entities/employee.entity';

export const EMPLOYEE_INCLUDE = {
  user: {
    select: {
      fullName: true,
      email: true,
      phone: true,
      roleId: true,
      status: true,
      role: { select: { name: true } },
    },
  },
  department: { select: { name: true } },
  store: { select: { name: true } },
} satisfies Prisma.EmployeeInclude;

export type EmployeeRow = Prisma.EmployeeGetPayload<{ include: typeof EMPLOYEE_INCLUDE }>;

export const toEmployeeView = (row: EmployeeRow): EmployeeView => ({
  id: row.id,
  userId: row.userId,
  employeeCode: row.employeeCode,
  fullName: row.user.fullName,
  email: row.user.email,
  phone: row.user.phone,
  roleId: row.user.roleId,
  roleName: row.user.role.name,
  userStatus: row.user.status,
  position: row.position,
  departmentId: row.departmentId,
  departmentName: row.department?.name ?? null,
  storeId: row.storeId,
  storeName: row.store?.name ?? null,
  hireDate: row.hireDate,
  salary: row.salary === null ? null : Number(row.salary),
  commissionRate: Number(row.commissionRate),
  status: row.status,
});
