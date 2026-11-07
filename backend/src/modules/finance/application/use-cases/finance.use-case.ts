import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { GetUserDataScopeUseCase } from '@modules/permissions/application/use-cases/get-user-data-scope.use-case';
import { GetUserEffectivePermissionsUseCase } from '@modules/permissions/application/use-cases/get-user-effective-permissions.use-case';
import {
  isStoreInScope,
  toStoreIdsFilter,
} from '@modules/permissions/application/utils/store-scope.util';
import {
  FINANCE_REPOSITORY,
  IFinanceRepository,
} from '../../domain/repositories/finance.repository.interface';

const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

// Ngày YYYY-MM-DD theo giờ VN → [0h VN, 0h VN hôm sau) tính bằng UTC
const vnDayRange = (day: string): { start: Date; end: Date } => {
  const start = new Date(new Date(`${day}T00:00:00Z`).getTime() - VN_OFFSET_MS);
  return { start, end: new Date(start.getTime() + DAY_MS) };
};

@Injectable()
export class FinanceUseCase {
  constructor(
    @Inject(FINANCE_REPOSITORY) private readonly repository: IFinanceRepository,
    private readonly getUserDataScope: GetUserDataScopeUseCase,
    private readonly getPermissions: GetUserEffectivePermissionsUseCase,
  ) {}

  // Người chỉ có quyền thu tiền (NV bán hàng) chỉ thấy giao dịch trong ca của chính mình
  async payments(
    userId: string,
    input: {
      page: number;
      limit: number;
      storeId?: string;
      from?: string;
      to?: string;
      paymentMethod?: string;
      status?: string;
    },
  ) {
    const [scope, permissions] = await Promise.all([
      this.getUserDataScope.execute(userId),
      this.getPermissions.execute(userId),
    ]);
    if (input.storeId && !isStoreInScope(scope, input.storeId)) {
      throw new ForbiddenException('Cửa hàng ngoài phạm vi của bạn');
    }
    const from = input.from ? vnDayRange(input.from).start : undefined;
    const to = input.to ? vnDayRange(input.to).end : undefined;
    if (from && to && from >= to) {
      throw new BadRequestException('Ngày bắt đầu phải trước hoặc bằng ngày kết thúc');
    }
    const cashierOnly =
      !permissions.includes('PAYMENT_RECONCILE') && !permissions.includes('PAYMENT_REFUND');
    return this.repository.findPayments({
      skip: (input.page - 1) * input.limit,
      take: input.limit,
      storeIds: input.storeId ? [input.storeId] : toStoreIdsFilter(scope),
      cashierId: cashierOnly ? userId : undefined,
      from,
      to,
      paymentMethod: input.paymentMethod,
      status: input.status,
    });
  }

  async reconciliation(userId: string, input: { date: string; storeId?: string }) {
    const scope = await this.getUserDataScope.execute(userId);
    if (input.storeId && !isStoreInScope(scope, input.storeId)) {
      throw new ForbiddenException('Cửa hàng ngoài phạm vi của bạn');
    }
    const { start, end } = vnDayRange(input.date);
    const groups = await this.repository.summarize(
      start,
      end,
      input.storeId ? [input.storeId] : toStoreIdsFilter(scope),
    );
    return {
      date: input.date,
      groups: groups.map((g) => ({
        ...g,
        canMark: g.reconciledCount < g.count && (g.channel === 'ONLINE' || g.unreconciledSessions === 0),
      })),
    };
  }

  // Đánh dấu đã đối soát cả nhóm; nhóm POS chỉ đánh dấu khi mọi ca liên quan đã chốt (RECONCILED)
  async mark(
    userId: string,
    input: { date: string; storeId: string; channel: 'POS' | 'ONLINE'; paymentMethod: string },
  ) {
    const scope = await this.getUserDataScope.execute(userId);
    if (!isStoreInScope(scope, input.storeId)) {
      throw new ForbiddenException('Cửa hàng ngoài phạm vi của bạn');
    }
    const { start, end } = vnDayRange(input.date);
    const result = await this.repository.markReconciled({
      dayStart: start,
      dayEnd: end,
      storeId: input.storeId,
      channel: input.channel,
      paymentMethod: input.paymentMethod,
    });
    if (!result.ok) {
      throw new ConflictException(
        `Còn ${result.unreconciledSessions} ca POS chưa chốt đối soát, chốt ca trước rồi mới đánh dấu`,
      );
    }
    return { marked: result.marked };
  }
}
