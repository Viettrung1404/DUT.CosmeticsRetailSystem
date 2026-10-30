import { ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  ADJUSTMENT_REPOSITORY,
  AdjustmentView,
  IAdjustmentRepository,
} from '../../domain/repositories/adjustment.repository.interface';

@Injectable()
export class CancelAdjustmentUseCase {
  constructor(@Inject(ADJUSTMENT_REPOSITORY) private readonly repository: IAdjustmentRepository) {}

  async execute(userId: string, id: string): Promise<AdjustmentView> {
    const adjustment = await this.repository.findById(id);
    if (!adjustment) throw new NotFoundException('Không tìm thấy phiếu điều chỉnh');
    if (adjustment.createdBy !== userId) {
      throw new ForbiddenException('Chỉ người lập phiếu được hủy phiếu');
    }
    if (!(await this.repository.close(id, 'CANCELLED', userId, null))) {
      throw new ConflictException('Phiếu không còn ở trạng thái chờ duyệt');
    }
    return (await this.repository.findById(id))!;
  }
}
