import { Inject, Injectable } from '@nestjs/common';
import { DepartmentView } from '../../domain/entities/department.entity';
import {
  DEPARTMENT_REPOSITORY,
  IDepartmentRepository,
} from '../../domain/repositories/department.repository.interface';

@Injectable()
export class GetDepartmentsUseCase {
  constructor(@Inject(DEPARTMENT_REPOSITORY) private readonly repository: IDepartmentRepository) {}

  execute(): Promise<DepartmentView[]> {
    return this.repository.findAll();
  }
}
