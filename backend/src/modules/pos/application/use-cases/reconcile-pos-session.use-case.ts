import {
  BadRequestException,
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

@Injectable()
export class ReconcilePosSessionUseCase {
  constructor(
    @Inject(POS_SESSION_REPOSITORY)
    private readonly repository: IPosSessionRepository,
    private readonly getUserDataScope: GetUserDataScopeUseCase,
  ) {}

  async execute(userId: string, sessionId: string, note?: string): Promise<PosSessionEntity> {
    const session = await this.repository.findById(sessionId);
    if (!session) {
      throw new NotFoundException('Không tìm thấy ca POS');
    }

    const scope = await this.getUserDataScope.execute(userId);
    if (!isStoreInScope(scope, session.storeId)) {
      throw new ForbiddenException('Ca này thuộc cửa hàng khác');
    }
    // Người đứng quầy không tự duyệt két của chính mình
    if (session.cashierId === userId) {
      throw new ForbiddenException('Không được tự chốt ca do chính mình đứng quầy');
    }
    if (session.status === 'OPEN') {
      throw new ConflictException('Ca chưa đóng, thu ngân phải đóng ca trước khi chốt');
    }
    if (session.status === 'RECONCILED') {
      throw new ConflictException('Ca này đã được chốt rồi');
    }

    const trimmedNote = note?.trim() || null;
    if (session.hasDifference() && !session.note && !trimmedNote) {
      throw new BadRequestException(
        `Ca lệch ${session.difference} đồng, cần ghi lý do chênh lệch trước khi chốt`,
      );
    }

    session.reconcile(userId, trimmedNote);
    if (!(await this.repository.saveReconciled(session, new Date()))) {
      throw new ConflictException('Ca này vừa được người khác chốt, vui lòng tải lại');
    }
    // Đọc lại để có tên người duyệt
    return (await this.repository.findById(session.id)) ?? session;
  }
}
