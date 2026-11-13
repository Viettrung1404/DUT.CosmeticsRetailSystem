import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import {
  IReturnAdminRepository,
  InspectLineInput,
  InspectResult,
  RETURN_ADMIN_REPOSITORY,
} from '../../domain/repositories/return-admin.repository.interface';
import { assertReturnTransition } from '../../domain/return-rules';
import { ReturnAccessService } from '../services/return-access.service';
import { AdminReturnDetail, GetAdminReturnDetailUseCase } from './get-admin-return-detail.use-case';

@Injectable()
export class InspectAdminReturnUseCase {
  constructor(
    @Inject(RETURN_ADMIN_REPOSITORY) private readonly repository: IReturnAdminRepository,
    private readonly access: ReturnAccessService,
    private readonly getDetail: GetAdminReturnDetailUseCase,
  ) {}

  async execute(
    userId: string,
    returnId: string,
    lines: InspectLineInput[],
    note?: string,
  ): Promise<{ detail: AdminReturnDetail; result: InspectResult }> {
    if (!lines.length) throw new BadRequestException('Cần kiểm định ít nhất một dòng hàng trả');
    const { info } = await this.access.getAccessibleReturn(userId, returnId);
    assertReturnTransition(info.status, 'INSPECTED');
    const result = await this.repository.inspect({ id: returnId, actorId: userId, lines, note });
    return { detail: await this.getDetail.execute(userId, returnId), result };
  }
}
