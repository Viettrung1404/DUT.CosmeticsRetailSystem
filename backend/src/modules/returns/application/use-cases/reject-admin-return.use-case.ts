import { Inject, Injectable } from '@nestjs/common';
import {
  IReturnAdminRepository,
  RETURN_ADMIN_REPOSITORY,
} from '../../domain/repositories/return-admin.repository.interface';
import { assertReturnTransition } from '../../domain/return-rules';
import { ReturnAccessService } from '../services/return-access.service';
import { AdminReturnDetail, GetAdminReturnDetailUseCase } from './get-admin-return-detail.use-case';

@Injectable()
export class RejectAdminReturnUseCase {
  constructor(
    @Inject(RETURN_ADMIN_REPOSITORY) private readonly repository: IReturnAdminRepository,
    private readonly access: ReturnAccessService,
    private readonly getDetail: GetAdminReturnDetailUseCase,
  ) {}

  async execute(userId: string, returnId: string, reason: string): Promise<AdminReturnDetail> {
    const { info } = await this.access.getAccessibleReturn(userId, returnId);
    assertReturnTransition(info.status, 'REJECTED');
    await this.repository.reject({ id: returnId, actorId: userId, reason });
    return this.getDetail.execute(userId, returnId);
  }
}
