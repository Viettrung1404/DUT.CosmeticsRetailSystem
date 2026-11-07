export const EMPLOYEE_STATUSES = ['ACTIVE', 'ON_LEAVE', 'RESIGNED'] as const;
export type EmployeeStatus = (typeof EMPLOYEE_STATUSES)[number];

export interface EmployeeView {
  id: string;
  userId: string;
  employeeCode: string;
  fullName: string;
  email: string;
  phone: string | null;
  roleId: number;
  roleName: string;
  userStatus: string;
  position: string;
  departmentId: string | null;
  departmentName: string | null;
  storeId: string | null;
  storeName: string | null;
  hireDate: Date;
  salary: number | null;
  commissionRate: number;
  status: string;
}
