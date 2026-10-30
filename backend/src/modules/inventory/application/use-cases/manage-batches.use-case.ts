import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { GetUserDataScopeUseCase } from '@modules/permissions/application/use-cases/get-user-data-scope.use-case';
import {
  isStoreInScope,
  toStoreIdsFilter,
} from '@modules/permissions/application/utils/store-scope.util';
import { nearExpiryThreshold, startOfVnToday } from '@core/utils/expiry-policy.util';
import {
  BATCH_REPOSITORY,
  BatchView,
  IBatchRepository,
} from '../../domain/repositories/batch.repository.interface';

export type BatchExpiryStatus = 'EXPIRED' | 'NEAR_EXPIRY' | 'OK';

export interface BatchListResult {
  items: (BatchView & { expiryStatus: BatchExpiryStatus; daysToExpiry: number })[];
  total: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

// Theo dõi và khóa lô: lô khóa bị bỏ qua ở mọi luồng xuất FEFO
@Injectable()
export class ManageBatchesUseCase {
  constructor(
    @Inject(BATCH_REPOSITORY) private readonly repository: IBatchRepository,
    private readonly getUserDataScope: GetUserDataScopeUseCase,
  ) {}

  async list(
    userId: string,
    input: {
      page: number;
      limit: number;
      storeId?: string;
      productVariantId?: string;
      search?: string;
      expiringWithinDays?: number;
      expired?: boolean;
      isActive?: boolean;
      includeEmpty?: boolean;
    },
  ): Promise<BatchListResult> {
    if (input.expired && input.expiringWithinDays) {
      throw new BadRequestException('Chỉ lọc "đã hết hạn" hoặc "sắp hết hạn", không lọc cả hai');
    }
    const scope = await this.getUserDataScope.execute(userId);
    if (input.storeId && !isStoreInScope(scope, input.storeId)) {
      throw new ForbiddenException('Địa điểm ngoài phạm vi của bạn');
    }
    const today = startOfVnToday();
    const result = await this.repository.findMany({
      skip: (input.page - 1) * input.limit,
      take: input.limit,
      storeIds: input.storeId ? [input.storeId] : toStoreIdsFilter(scope),
      productVariantId: input.productVariantId,
      search: input.search?.trim() || undefined,
      expiryFrom: input.expiringWithinDays ? new Date(today.getTime() + DAY_MS) : undefined,
      expiryBefore: input.expired
        ? new Date(today.getTime() + DAY_MS)
        : input.expiringWithinDays
          ? new Date(today.getTime() + (input.expiringWithinDays + 1) * DAY_MS)
          : undefined,
      isActive: input.isActive,
      includeEmpty: input.includeEmpty ?? false,
    });
    const near = nearExpiryThreshold();
    return {
      total: result.total,
      items: result.items.map((b) => ({
        ...b,
        daysToExpiry: Math.round((b.expiryDate.getTime() - today.getTime()) / DAY_MS),
        expiryStatus: b.expiryDate.getTime() <= today.getTime() ? 'EXPIRED' : b.expiryDate < near ? 'NEAR_EXPIRY' : 'OK',
      })),
    };
  }

  async setActive(userId: string, id: string, isActive: boolean, reason?: string): Promise<BatchView> {
    const batch = await this.repository.findById(id);
    if (!batch) throw new NotFoundException('Không tìm thấy lô hàng');
    const scope = await this.getUserDataScope.execute(userId);
    if (!isStoreInScope(scope, batch.storeId)) {
      throw new ForbiddenException('Lô hàng thuộc địa điểm ngoài phạm vi của bạn');
    }
    if (batch.isActive === isActive) {
      throw new ConflictException(isActive ? 'Lô đang mở, không cần mở lại' : 'Lô đã bị khóa trước đó');
    }
    const note = reason?.trim() || null;
    if (!isActive && !note) throw new BadRequestException('Khóa lô phải ghi lý do');
    return this.repository.setActive(id, isActive, userId, note);
  }
}
