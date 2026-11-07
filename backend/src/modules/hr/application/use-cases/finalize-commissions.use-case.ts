import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { GetUserDataScopeUseCase } from '@modules/permissions/application/use-cases/get-user-data-scope.use-case';
import {
  COMMISSION_REPOSITORY,
  ICommissionRepository,
} from '../../domain/repositories/commission.repository.interface';

const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

// Chốt cả tháng cho toàn chuỗi, nên chỉ người có phạm vi ALL; tháng đã chốt không chốt lại
@Injectable()
export class FinalizeCommissionsUseCase {
  constructor(
    @Inject(COMMISSION_REPOSITORY) private readonly repository: ICommissionRepository,
    private readonly getUserDataScope: GetUserDataScopeUseCase,
  ) {}

  async execute(
    userId: string,
    month: number,
    year: number,
    now: Date = new Date(),
  ): Promise<{ month: number; year: number; finalizedCount: number }> {
    const scope = await this.getUserDataScope.execute(userId);
    if (scope.type !== 'ALL') {
      throw new ForbiddenException('Chỉ người có phạm vi toàn chuỗi được chốt hoa hồng tháng');
    }

    const vn = new Date(now.getTime() + VN_OFFSET_MS);
    if (year * 12 + month >= vn.getUTCFullYear() * 12 + vn.getUTCMonth() + 1) {
      throw new BadRequestException('Chỉ chốt được tháng đã kết thúc');
    }

    const { pending, paid } = await this.repository.countByStatus(month, year);
    if (paid > 0) {
      throw new ConflictException(`Hoa hồng tháng ${month}/${year} đã được chốt, không chốt lại`);
    }
    if (pending === 0) {
      throw new ConflictException(`Tháng ${month}/${year} không có hoa hồng nào chờ chốt`);
    }

    const finalizedCount = await this.repository.finalize(month, year);
    return { month, year, finalizedCount };
  }
}
