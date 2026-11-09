import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  IReturnAdminRepository,
  RETURN_ADMIN_REPOSITORY,
  ReturnDetail,
} from '../../domain/repositories/return-admin.repository.interface';
import { ReturnActions, returnActions } from '../../domain/return-rules';
import { ReturnAccessService } from '../services/return-access.service';

export type AdminReturnDetail = ReturnDetail & { actions: ReturnActions };

@Injectable()
export class GetAdminReturnDetailUseCase {
  constructor(
    @Inject(RETURN_ADMIN_REPOSITORY) private readonly repository: IReturnAdminRepository,
    private readonly access: ReturnAccessService,
  ) {}

  async execute(userId: string, returnId: string): Promise<AdminReturnDetail> {
    await this.access.getAccessibleReturn(userId, returnId);
    const detail = await this.repository.findDetail(returnId);
    if (!detail) throw new NotFoundException('Không tìm thấy yêu cầu đổi trả');
    return { ...detail, actions: returnActions(detail.status) };
  }
}
