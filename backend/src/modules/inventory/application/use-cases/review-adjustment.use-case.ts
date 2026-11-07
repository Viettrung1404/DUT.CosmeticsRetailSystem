import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { GetUserDataScopeUseCase } from '@modules/permissions/application/use-cases/get-user-data-scope.use-case';
import { isStoreInScope } from '@modules/permissions/application/utils/store-scope.util';
import {
  ADJUSTMENT_REPOSITORY,
  AdjustmentView,
  IAdjustmentRepository,
} from '../../domain/repositories/adjustment.repository.interface';
import { stockFailureToException } from '../utils/stock-error.util';

// Duyệt / từ chối phiếu giảm tồn: người duyệt phải khác người lập
@Injectable()
export class ReviewAdjustmentUseCase {
  constructor(
    @Inject(ADJUSTMENT_REPOSITORY) private readonly repository: IAdjustmentRepository,
    private readonly getUserDataScope: GetUserDataScopeUseCase,
  ) {}

  async execute(
    userId: string,
    id: string,
    decision: 'APPROVE' | 'REJECT',
    note?: string,
  ): Promise<AdjustmentView> {
    const adjustment = await this.repository.findById(id);
    if (!adjustment) throw new NotFoundException('Không tìm thấy phiếu điều chỉnh');

    const scope = await this.getUserDataScope.execute(userId);
    if (!isStoreInScope(scope, adjustment.storeId)) {
      throw new ForbiddenException('Phiếu thuộc địa điểm ngoài phạm vi của bạn');
    }
    if (adjustment.status !== 'PENDING') {
      throw new ConflictException('Phiếu không còn ở trạng thái chờ duyệt');
    }
    if (adjustment.createdBy === userId) {
      throw new ForbiddenException('Người lập phiếu không tự duyệt phiếu của mình');
    }

    const reviewNote = note?.trim() || null;
    if (decision === 'REJECT') {
      if (!(await this.repository.close(id, 'REJECTED', userId, reviewNote))) {
        throw stockFailureToException('STATUS_CHANGED');
      }
      return (await this.repository.findById(id))!;
    }

    const result = await this.repository.approve(id, userId, reviewNote);
    if (!result.ok) throw stockFailureToException(result.reason, result.available);
    return result.adjustment;
  }
}
