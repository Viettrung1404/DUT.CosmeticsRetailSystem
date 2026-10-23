import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { GetUserDataScopeUseCase } from '@modules/permissions/application/use-cases/get-user-data-scope.use-case';
import {
  IPosSessionRepository,
  POS_SESSION_REPOSITORY,
} from '../../domain/repositories/pos-session.repository.interface';

// Chỉ người được gán cửa hàng mới tra cứu bán hàng ở cửa hàng đó (phạm vi ALL cũng không qua)
@Injectable()
export class PosStoreAccessService {
  constructor(
    @Inject(POS_SESSION_REPOSITORY)
    private readonly sessionRepository: IPosSessionRepository,
    private readonly getUserDataScope: GetUserDataScopeUseCase,
  ) {}

  async assertCanSell(userId: string, storeId: string): Promise<void> {
    const store = await this.sessionRepository.findStore(storeId);
    if (!store) {
      throw new NotFoundException('Không tìm thấy cửa hàng');
    }
    if (!store.isActive) {
      throw new BadRequestException('Cửa hàng đang ngừng hoạt động');
    }
    if (store.type === 'WAREHOUSE') {
      throw new BadRequestException('Kho tổng không bán hàng tại quầy');
    }
    const scope = await this.getUserDataScope.execute(userId);
    if (!scope.storeIds.includes(store.id)) {
      throw new ForbiddenException('Bạn không được phân công làm việc tại cửa hàng này');
    }
  }
}
