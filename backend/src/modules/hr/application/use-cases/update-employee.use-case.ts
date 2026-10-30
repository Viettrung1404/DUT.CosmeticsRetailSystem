import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EMPLOYEE_STATUSES, EmployeeView } from '../../domain/entities/employee.entity';
import {
  EMPLOYEE_REPOSITORY,
  EmployeePatch,
  IEmployeeRepository,
} from '../../domain/repositories/employee.repository.interface';

@Injectable()
export class UpdateEmployeeUseCase {
  constructor(
    @Inject(EMPLOYEE_REPOSITORY) private readonly repository: IEmployeeRepository,
  ) {}

  async execute(id: string, input: EmployeePatch): Promise<EmployeeView> {
    const current = await this.repository.findById(id);
    if (!current) throw new NotFoundException('Không tìm thấy nhân viên');

    const patch: EmployeePatch = { ...input };
    if (patch.fullName !== undefined) patch.fullName = patch.fullName.trim();
    if (patch.position !== undefined) patch.position = patch.position.trim();

    if (patch.phone !== undefined) {
      patch.phone = patch.phone?.trim() || null;
      if (patch.phone) {
        const owner = await this.repository.findPhoneOwner(patch.phone);
        if (owner && owner.id !== current.userId) {
          throw new ConflictException('Số điện thoại đã được sử dụng');
        }
      }
    }
    if (patch.departmentId && !(await this.repository.departmentExists(patch.departmentId))) {
      throw new BadRequestException('Phòng ban không tồn tại');
    }
    if (patch.storeId && !(await this.repository.storeExists(patch.storeId))) {
      throw new BadRequestException('Cửa hàng không tồn tại');
    }
    if (patch.status !== undefined && !(EMPLOYEE_STATUSES as readonly string[]).includes(patch.status)) {
      throw new BadRequestException('Trạng thái nhân viên không hợp lệ');
    }

    return this.repository.update(id, patch);
  }
}
