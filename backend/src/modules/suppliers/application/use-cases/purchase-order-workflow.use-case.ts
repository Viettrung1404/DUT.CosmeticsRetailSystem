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
import {
  IPurchaseOrderRepository,
  PURCHASE_ORDER_REPOSITORY,
  PurchaseOrderLine,
  PurchaseOrderView,
} from '../../domain/repositories/purchase-order.repository.interface';

const OPEN_STATUSES = ['DRAFT', 'SENT', 'CONFIRMED'];

const toDate = (value?: string | null): Date | null | undefined =>
  value === undefined ? undefined : value === null ? null : new Date(`${value}T00:00:00Z`);

// DRAFT (KHO lập) → SENT (KT/Admin "duyệt & gửi", khác người lập) → CONFIRMED (KHO ghi NCC xác nhận)
// → PARTIALLY_RECEIVED / RECEIVED (tự chuyển khi nhận hàng) · CANCELLED khi chưa nhận dòng nào
@Injectable()
export class PurchaseOrderWorkflowUseCase {
  constructor(
    @Inject(PURCHASE_ORDER_REPOSITORY) private readonly repository: IPurchaseOrderRepository,
    private readonly getUserDataScope: GetUserDataScopeUseCase,
  ) {}

  async create(
    userId: string,
    input: {
      supplierId: string;
      storeId: string;
      note?: string;
      expectedDate?: string;
      items: PurchaseOrderLine[];
    },
  ): Promise<PurchaseOrderView> {
    const [store, supplier] = await Promise.all([
      this.repository.findStore(input.storeId),
      this.repository.findSupplier(input.supplierId),
    ]);
    if (!store) throw new NotFoundException('Không tìm thấy kho nhận hàng');
    if (!supplier) throw new NotFoundException('Không tìm thấy nhà cung cấp');
    if (!supplier.isActive) throw new BadRequestException('Nhà cung cấp đã ngừng hợp tác');
    // Nhà cung cấp chỉ giao về kho tổng
    if (store.type !== 'WAREHOUSE' || !store.isActive) {
      throw new BadRequestException('Đơn đặt hàng chỉ giao về kho tổng đang hoạt động');
    }
    const scope = await this.getUserDataScope.execute(userId);
    if (!isStoreInScope(scope, store.id)) {
      throw new ForbiddenException('Bạn không lập đơn đặt hàng cho kho này');
    }
    await this.validateLines(input.items);
    const id = await this.repository.create({
      supplierId: supplier.id,
      storeId: store.id,
      note: input.note?.trim() || null,
      expectedDate: toDate(input.expectedDate) ?? null,
      createdBy: userId,
      items: input.items,
    });
    return (await this.repository.findById(id))!;
  }

  async updateDraft(
    userId: string,
    id: string,
    input: { note?: string | null; expectedDate?: string | null; items?: PurchaseOrderLine[] },
  ): Promise<PurchaseOrderView> {
    await this.load(userId, id, ['DRAFT']);
    if (input.items) await this.validateLines(input.items);
    const ok = await this.repository.replaceDraft(id, {
      note: input.note === undefined ? undefined : input.note?.trim() || null,
      expectedDate: toDate(input.expectedDate),
      items: input.items,
    });
    if (!ok) throw this.statusChanged();
    return (await this.repository.findById(id))!;
  }

  async approveAndSend(userId: string, id: string): Promise<PurchaseOrderView> {
    const po = await this.load(userId, id, ['DRAFT']);
    if (po.createdBy === userId) {
      throw new ForbiddenException('Người lập đơn không tự duyệt đơn của mình');
    }
    if (!(await this.repository.changeStatus(id, ['DRAFT'], 'SENT', { approvedBy: userId }))) {
      throw this.statusChanged();
    }
    return (await this.repository.findById(id))!;
  }

  async confirm(userId: string, id: string): Promise<PurchaseOrderView> {
    await this.load(userId, id, ['SENT']);
    if (!(await this.repository.changeStatus(id, ['SENT'], 'CONFIRMED'))) throw this.statusChanged();
    return (await this.repository.findById(id))!;
  }

  async cancel(userId: string, id: string): Promise<PurchaseOrderView> {
    const po = await this.load(userId, id, OPEN_STATUSES);
    if (po.items.some((i) => i.quantityReceived > 0)) {
      throw new ConflictException('Đơn đã nhận một phần hàng, không hủy được');
    }
    const ok = await this.repository.changeStatus(id, OPEN_STATUSES, 'CANCELLED', {
      requireNothingReceived: true,
    });
    if (!ok) throw this.statusChanged();
    return (await this.repository.findById(id))!;
  }

  async list(
    userId: string,
    input: { page: number; limit: number; supplierId?: string; status?: string; search?: string },
  ) {
    const scope = await this.getUserDataScope.execute(userId);
    return this.repository.findMany({
      skip: (input.page - 1) * input.limit,
      take: input.limit,
      storeIds: toStoreIdsFilter(scope),
      supplierId: input.supplierId,
      status: input.status,
      search: input.search?.trim() || undefined,
    });
  }

  detail(userId: string, id: string): Promise<PurchaseOrderView> {
    return this.load(userId, id);
  }

  private async load(userId: string, id: string, expected?: string[]): Promise<PurchaseOrderView> {
    const po = await this.repository.findById(id);
    if (!po) throw new NotFoundException('Không tìm thấy đơn đặt hàng');
    const scope = await this.getUserDataScope.execute(userId);
    if (!isStoreInScope(scope, po.storeId)) {
      throw new ForbiddenException('Đơn đặt hàng thuộc kho ngoài phạm vi của bạn');
    }
    if (expected && !expected.includes(po.status)) {
      throw new ConflictException(`Đơn đang ở trạng thái ${po.status}, không thực hiện được bước này`);
    }
    return po;
  }

  private async validateLines(items: PurchaseOrderLine[]) {
    if (!items.length) throw new BadRequestException('Đơn đặt hàng cần ít nhất một sản phẩm');
    const ids = items.map((i) => i.productVariantId);
    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException('Mỗi sản phẩm chỉ ghi một dòng trên đơn');
    }
    if ((await this.repository.findMissingVariants(ids)).length) {
      throw new NotFoundException('Có sản phẩm không tồn tại trong danh mục');
    }
  }

  private statusChanged() {
    return new ConflictException('Đơn vừa được người khác xử lý, tải lại để xem trạng thái mới');
  }
}
