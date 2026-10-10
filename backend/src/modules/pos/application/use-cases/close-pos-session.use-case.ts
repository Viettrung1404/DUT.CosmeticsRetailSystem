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
  IPosSessionRepository,
  POS_SESSION_REPOSITORY,
} from '../../domain/repositories/pos-session.repository.interface';
import { PosSessionEntity } from '../../domain/entities/pos-session.entity';

export interface ClosePosSessionInput {
  countedCash: number;
  note?: string;
}

@Injectable()
export class ClosePosSessionUseCase {
  constructor(
    @Inject(POS_SESSION_REPOSITORY)
    private readonly repository: IPosSessionRepository,
    private readonly getUserDataScope: GetUserDataScopeUseCase,
  ) {}

  async execute(
    userId: string,
    permissionCodes: string[],
    sessionId: string,
    input: ClosePosSessionInput,
  ): Promise<PosSessionEntity> {
    const session = await this.repository.findById(sessionId);
    if (!session) {
      throw new NotFoundException('Không tìm thấy ca POS');
    }

    // Thu ngân tự đóng ca mình; người có quyền chốt ca (quản lý) đóng hộ được trong cửa hàng của họ
    if (session.cashierId !== userId) {
      const scope = await this.getUserDataScope.execute(userId);
      const canCloseForOthers =
        permissionCodes.includes('PAYMENT_RECONCILE') && isStoreInScope(scope, session.storeId);
      if (!canCloseForOthers) {
        throw new ForbiddenException('Bạn chỉ được đóng ca do chính mình mở');
      }
    }
    if (session.status !== 'OPEN') {
      throw new ConflictException('Ca này đã đóng rồi');
    }

    const systemCash = await this.repository.sumCompletedCash(session.id);
    session.close(input.countedCash, systemCash, input.note?.trim() || null, new Date());
    if (!(await this.repository.saveClosed(session))) {
      throw new ConflictException('Ca này vừa được đóng ở nơi khác, vui lòng tải lại');
    }
    return session;
  }
}
