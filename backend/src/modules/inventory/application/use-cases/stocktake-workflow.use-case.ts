import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { GetUserDataScopeUseCase } from '@modules/permissions/application/use-cases/get-user-data-scope.use-case';
import {
  isStoreInScope,
  toStoreIdsFilter,
} from '@modules/permissions/application/utils/store-scope.util';
import {
  INVENTORY_REPOSITORY,
  IInventoryRepository,
} from '../../domain/repositories/inventory.repository.interface';
import {
  IStocktakeRepository,
  STOCKTAKE_REPOSITORY,
  StocktakeCountInput,
  StocktakeView,
  StocktakeWriteResult,
} from '../../domain/repositories/stocktake.repository.interface';
import { stockFailureToException } from '../utils/stock-error.util';

// Kiểm kê: DRAFT → IN_PROGRESS khi nhập số đếm → COMPLETED (có chênh lệch thì người chốt khác người lập)
@Injectable()
export class StocktakeWorkflowUseCase {
  constructor(
    @Inject(STOCKTAKE_REPOSITORY) private readonly repository: IStocktakeRepository,
    @Inject(INVENTORY_REPOSITORY) private readonly inventory: IInventoryRepository,
    private readonly getUserDataScope: GetUserDataScopeUseCase,
  ) {}

  async create(userId: string, input: { storeId: string; note?: string }): Promise<StocktakeView> {
    const store = await this.inventory.findStore(input.storeId);
    if (!store) throw new NotFoundException('Không tìm thấy kho / cửa hàng');
    const scope = await this.getUserDataScope.execute(userId);
    if (!isStoreInScope(scope, store.id)) {
      throw new ForbiddenException('Bạn không kiểm kê được địa điểm này');
    }
    const id = await this.repository.create({
      storeId: store.id,
      note: input.note?.trim() || null,
      createdBy: userId,
    });
    return (await this.repository.findById(id))!;
  }

  async recordCounts(userId: string, id: string, items: StocktakeCountInput[]): Promise<StocktakeView> {
    const stocktake = await this.load(userId, id, ['DRAFT', 'IN_PROGRESS']);
    if (!items.length) throw new BadRequestException('Cần ít nhất một dòng số đếm');
    const keys = items.map((i) => `${i.productVariantId}:${i.batchId ?? ''}`);
    if (new Set(keys).size !== keys.length) {
      throw new BadRequestException('Mỗi sản phẩm / lô chỉ ghi một dòng trong một lần gửi');
    }
    this.raise(await this.repository.recordCounts(id, stocktake.storeId, items));
    return (await this.repository.findById(id))!;
  }

  async complete(userId: string, id: string): Promise<StocktakeView> {
    const stocktake = await this.load(userId, id, ['IN_PROGRESS']);
    const hasVariance = stocktake.items.some((i) => i.varianceQuantity !== 0);
    if (hasVariance && stocktake.createdBy === userId) {
      throw new ForbiddenException('Phiếu có chênh lệch: người lập không tự chốt, cần người khác duyệt');
    }
    this.raise(await this.repository.complete(id, userId));
    return (await this.repository.findById(id))!;
  }

  async cancel(userId: string, id: string): Promise<StocktakeView> {
    await this.load(userId, id, ['DRAFT', 'IN_PROGRESS']);
    if (!(await this.repository.cancel(id))) this.raise({ ok: false, reason: 'STATUS_CHANGED' });
    return (await this.repository.findById(id))!;
  }

  async list(userId: string, input: { page: number; limit: number; storeId?: string; status?: string }) {
    const scope = await this.getUserDataScope.execute(userId);
    if (input.storeId && !isStoreInScope(scope, input.storeId)) {
      throw new ForbiddenException('Địa điểm ngoài phạm vi của bạn');
    }
    return this.repository.findMany({
      skip: (input.page - 1) * input.limit,
      take: input.limit,
      storeIds: input.storeId ? [input.storeId] : toStoreIdsFilter(scope),
      status: input.status,
    });
  }

  detail(userId: string, id: string): Promise<StocktakeView> {
    return this.load(userId, id);
  }

  private async load(userId: string, id: string, expected?: string[]): Promise<StocktakeView> {
    const stocktake = await this.repository.findById(id);
    if (!stocktake) throw new NotFoundException('Không tìm thấy phiếu kiểm kê');
    const scope = await this.getUserDataScope.execute(userId);
    if (!isStoreInScope(scope, stocktake.storeId)) {
      throw new ForbiddenException('Phiếu kiểm kê ngoài phạm vi của bạn');
    }
    if (expected && !expected.includes(stocktake.status)) {
      throw new ConflictException(`Phiếu đang ở trạng thái ${stocktake.status}, không thực hiện được bước này`);
    }
    return stocktake;
  }

  private raise(result: StocktakeWriteResult): void {
    if (result.ok) return;
    const sku = result.sku ? ` (${result.sku})` : '';
    let error: HttpException;
    if (result.reason === 'BATCH_REQUIRED') {
      error = new BadRequestException(`Sản phẩm${sku} đang quản lý theo lô, hãy chọn lô khi nhập số đếm`);
    } else if (result.reason === 'VARIANT_NOT_FOUND') {
      error = new NotFoundException('Có sản phẩm không tồn tại trong danh mục');
    } else if (result.reason === 'BATCH_NOT_FOUND') {
      error = new NotFoundException(`Lô${sku} không thuộc địa điểm / sản phẩm này`);
    } else {
      error = stockFailureToException(result.reason, result.available, result.sku);
    }
    throw error;
  }
}
