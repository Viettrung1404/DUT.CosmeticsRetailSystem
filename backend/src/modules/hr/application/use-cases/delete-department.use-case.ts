import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  DEPARTMENT_REPOSITORY,
  IDepartmentRepository,
} from '../../domain/repositories/department.repository.interface';

// Bảng departments không có cột ẩn nên xóa cứng, chỉ khi không còn nhân viên
@Injectable()
export class DeleteDepartmentUseCase {
  constructor(@Inject(DEPARTMENT_REPOSITORY) private readonly repository: IDepartmentRepository) {}

  async execute(id: string): Promise<void> {
    if (!(await this.repository.findById(id))) {
      throw new NotFoundException('Không tìm thấy phòng ban');
    }
    const count = await this.repository.countEmployees(id);
    if (count > 0) {
      throw new ConflictException(
        `Phòng ban còn ${count} nhân viên, hãy chuyển họ sang phòng ban khác trước`,
      );
    }
    await this.repository.delete(id);
  }
}
