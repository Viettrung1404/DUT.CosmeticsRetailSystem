import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  DataScope,
  GetUserDataScopeUseCase,
} from '@modules/permissions/application/use-cases/get-user-data-scope.use-case';
import {
  IReturnAdminRepository,
  RETURN_ADMIN_REPOSITORY,
  ReturnAccessInfo,
} from '../../domain/repositories/return-admin.repository.interface';
import { assertStoreInScope } from '../utils/scope.util';

@Injectable()
export class ReturnAccessService {
  constructor(
    @Inject(RETURN_ADMIN_REPOSITORY) private readonly repository: IReturnAdminRepository,
    private readonly getUserDataScope: GetUserDataScopeUseCase,
  ) {}

  async getAccessibleReturn(
    userId: string,
    returnId: string,
  ): Promise<{ info: ReturnAccessInfo; scope: DataScope }> {
    const info = await this.repository.findAccessInfo(returnId);
    if (!info) throw new NotFoundException('Không tìm thấy yêu cầu đổi trả');
    const scope = await this.getUserDataScope.execute(userId);
    assertStoreInScope(scope, info.storeId, 'Yêu cầu đổi trả');
    return { info, scope };
  }
}
