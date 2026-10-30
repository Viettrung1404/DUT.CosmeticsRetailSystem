import { EmployeeView } from '../entities/employee.entity';

export const EMPLOYEE_REPOSITORY = Symbol('IEmployeeRepository');

export interface EmployeeListFilter {
  skip: number;
  take: number;
  order: 'asc' | 'desc';
  search?: string;
  storeIds?: string[];
  departmentId?: string;
  status?: string;
  employeeId?: string;
}

export interface EmployeePatch {
  fullName?: string;
  phone?: string | null;
  position?: string;
  departmentId?: string | null;
  storeId?: string | null;
  hireDate?: Date;
  salary?: number | null;
  commissionRate?: number;
  status?: string;
}

export interface IEmployeeRepository {
  findAll(filter: EmployeeListFilter): Promise<{ items: EmployeeView[]; total: number }>;
  findById(id: string): Promise<EmployeeView | null>;
  findByUserId(userId: string): Promise<EmployeeView | null>;
  departmentExists(id: string): Promise<boolean>;
  storeExists(id: string): Promise<boolean>;
  findPhoneOwner(phone: string): Promise<{ id: string } | null>;
  findMaxEmployeeNumber(): Promise<number>;
  update(id: string, patch: EmployeePatch, actorId: string): Promise<EmployeeView>;
}
