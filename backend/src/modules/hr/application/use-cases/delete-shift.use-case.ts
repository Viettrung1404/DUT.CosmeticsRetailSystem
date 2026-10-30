import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { GetUserDataScopeUseCase } from '@modules/permissions/application/use-cases/get-user-data-scope.use-case';
import { IShiftRepository, SHIFT_REPOSITORY } from '../../domain/repositories/shift.repository.interface';
import { assertCanWriteShiftOfStore } from './shift-scope.util';

// Bảng shifts không có cột ẩn nên xóa cứng, chỉ khi chưa có dòng chấm công nào dùng ca
@Injectable()
export class DeleteShiftUseCase {
  constructor(
    @Inject(SHIFT_REPOSITORY) private readonly repository: IShiftRepository,
    private readonly getUserDataScope: GetUserDataScopeUseCase,
  ) {}

  async execute(userId: string, id: string): Promise<void> {
    const shift = await this.repository.findById(id);
    if (!shift) throw new NotFoundException('Không tìm thấy ca làm việc');
    assertCanWriteShiftOfStore(await this.getUserDataScope.execute(userId), shift.storeId);

    const count = await this.repository.countAttendance(id);
    if (count > 0) {
      throw new ConflictException(`Ca đã có ${count} dòng chấm công, không thể xóa`);
    }
    await this.repository.delete(id);
  }
}
