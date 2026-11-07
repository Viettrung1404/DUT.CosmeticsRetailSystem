import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { DepartmentView } from '../../domain/entities/department.entity';
import {
  DEPARTMENT_REPOSITORY,
  DepartmentData,
  IDepartmentRepository,
} from '../../domain/repositories/department.repository.interface';

@Injectable()
export class CreateDepartmentUseCase {
  constructor(@Inject(DEPARTMENT_REPOSITORY) private readonly repository: IDepartmentRepository) {}

  async execute(input: DepartmentData): Promise<DepartmentView> {
    const name = input.name.trim();
    if (await this.repository.findByName(name)) {
      throw new ConflictException('Tên phòng ban đã tồn tại');
    }
    return this.repository.create({ name, description: input.description?.trim() || null });
  }
}
