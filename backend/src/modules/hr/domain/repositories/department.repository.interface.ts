import { DepartmentView } from '../entities/department.entity';

export const DEPARTMENT_REPOSITORY = Symbol('IDepartmentRepository');

export interface DepartmentData {
  name: string;
  description?: string | null;
}

export interface IDepartmentRepository {
  findAll(): Promise<DepartmentView[]>;
  findById(id: string): Promise<DepartmentView | null>;
  findByName(name: string): Promise<{ id: string } | null>;
  create(data: DepartmentData): Promise<DepartmentView>;
  update(id: string, data: Partial<DepartmentData>): Promise<DepartmentView>;
  countEmployees(id: string): Promise<number>;
  delete(id: string): Promise<void>;
}
