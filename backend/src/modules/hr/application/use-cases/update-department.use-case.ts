import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DepartmentView } from '../../domain/entities/department.entity';
import {
  DEPARTMENT_REPOSITORY,
  IDepartmentRepository,
} from '../../domain/repositories/department.repository.interface';

@Injectable()
export class UpdateDepartmentUseCase {
  constructor(@Inject(DEPARTMENT_REPOSITORY) private readonly repository: IDepartmentRepository) {}

  async execute(
    id: string,
    input: { name?: string; description?: string | null },
  ): Promise<DepartmentView> {
    if (!(await this.repository.findById(id))) {
      throw new NotFoundException('Không tìm thấy phòng ban');
    }
    const data: { name?: string; description?: string | null } = {};
    if (input.name !== undefined) {
      const name = input.name.trim();
      const same = await this.repository.findByName(name);
      if (same && same.id !== id) throw new ConflictException('Tên phòng ban đã tồn tại');
      data.name = name;
    }
    if (input.description !== undefined) data.description = input.description?.trim() || null;
    return this.repository.update(id, data);
  }
}
