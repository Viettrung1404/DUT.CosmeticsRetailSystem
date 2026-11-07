import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { GetUserDataScopeUseCase } from '@modules/permissions/application/use-cases/get-user-data-scope.use-case';
import { isStoreInScope } from '@modules/permissions/application/utils/store-scope.util';
import {
  IPosSessionRepository,
  POS_SESSION_REPOSITORY,
} from '../../domain/repositories/pos-session.repository.interface';
import { PosSessionEntity } from '../../domain/entities/pos-session.entity';

@Injectable()
export class GetCurrentPosSessionUseCase {
  constructor(
    @Inject(POS_SESSION_REPOSITORY)
    private readonly repository: IPosSessionRepository,
    private readonly getUserDataScope: GetUserDataScopeUseCase,
  ) {}

  async execute(userId: string, storeId: string): Promise<PosSessionEntity | null> {
    const scope = await this.getUserDataScope.execute(userId);
    if (!isStoreInScope(scope, storeId)) {
      throw new ForbiddenException('Bạn không thuộc cửa hàng này');
    }
    return this.repository.findOpenByStore(storeId);
  }
}
