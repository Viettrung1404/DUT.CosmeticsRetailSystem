import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { GetUserDataScopeUseCase } from '@modules/permissions/application/use-cases/get-user-data-scope.use-case';
import { isStoreInScope } from '@modules/permissions/application/utils/store-scope.util';
import {
  INVENTORY_REPOSITORY,
  IInventoryRepository,
} from '../../domain/repositories/inventory.repository.interface';
import {
  ADJUSTMENT_REPOSITORY,
  AdjustmentLineInput,
  AdjustmentView,
  IAdjustmentRepository,
} from '../../domain/repositories/adjustment.repository.interface';
import { startOfVnToday } from '../utils/vn-date.util';
import { stockFailureToException } from '../utils/stock-error.util';

export interface AdjustInventoryInput {
  storeId: string;
  productVariantId: string;
  quantity: number;
  reason: string;
  batchId?: string;
  batchNumber?: string;
  expiryDate?: string;
  manufactureDate?: string;
}

// T4: lập phiếu điều chỉnh. Tăng tồn áp ngay; giảm tồn (xuất hủy) chờ người khác duyệt
@Injectable()
export class AdjustInventoryUseCase {
  constructor(
    @Inject(INVENTORY_REPOSITORY)
    private readonly repository: IInventoryRepository,
    @Inject(ADJUSTMENT_REPOSITORY)
    private readonly adjustments: IAdjustmentRepository,
    private readonly getUserDataScope: GetUserDataScopeUseCase,
  ) {}

  async execute(userId: string, input: AdjustInventoryInput): Promise<AdjustmentView> {
    if (input.quantity === 0) {
      throw new BadRequestException('Số lượng điều chỉnh phải khác 0');
    }
    const reason = input.reason.trim();
    if (!reason) {
      throw new BadRequestException('Phải ghi lý do điều chỉnh tồn kho');
    }

    const store = await this.repository.findStore(input.storeId);
    if (!store) {
      throw new NotFoundException('Không tìm thấy cửa hàng / kho');
    }
    const scope = await this.getUserDataScope.execute(userId);
    if (!isStoreInScope(scope, store.id)) {
      throw new ForbiddenException('Bạn không điều chỉnh được tồn kho của địa điểm này');
    }
    if (!(await this.repository.variantExists(input.productVariantId))) {
      throw new NotFoundException('Không tìm thấy biến thể sản phẩm');
    }

    const line: AdjustmentLineInput = {
      productVariantId: input.productVariantId,
      quantity: input.quantity,
      batchId: input.batchId,
    };

    // Nhập thêm (hàng 0 đồng: mẫu thử, giao bù) phải gắn vào một lô để giữ tồn kho = tổng các lô
    if (input.quantity > 0 && !input.batchId) {
      const batchNumber = input.batchNumber?.trim();
      if (!batchNumber || !input.expiryDate) {
        throw new BadRequestException('Nhập thêm hàng cần chọn lô có sẵn hoặc khai báo số lô và hạn sử dụng');
      }
      const expiryDate = new Date(`${input.expiryDate}T00:00:00Z`);
      if (expiryDate.getTime() <= startOfVnToday().getTime()) {
        throw new BadRequestException(`Lô ${batchNumber} đã hết hạn, không nhập kho được`);
      }
      const manufactureDate = input.manufactureDate
        ? new Date(`${input.manufactureDate}T00:00:00Z`)
        : null;
      if (manufactureDate && manufactureDate.getTime() >= expiryDate.getTime()) {
        throw new BadRequestException(`Lô ${batchNumber}: ngày sản xuất phải trước hạn sử dụng`);
      }
      line.newBatch = { batchNumber, expiryDate, manufactureDate };
    }

    // Kiểm sớm để báo lỗi ngay lúc lập; lúc duyệt kiểm lại có khóa dòng
    if (input.quantity < 0) {
      const stock = await this.adjustments.currentStock(store.id, input.productVariantId);
      const need = -input.quantity;
      if (stock.quantity < need) throw stockFailureToException('NO_STOCK', stock.quantity);
      if (stock.quantity - need < stock.reserved) {
        throw stockFailureToException('RESERVED_CONFLICT', stock.quantity - stock.reserved);
      }
    }

    const result = await this.adjustments.create({
      storeId: store.id,
      reason,
      createdBy: userId,
      applyNow: input.quantity > 0,
      lines: [line],
    });
    if (!result.ok) throw stockFailureToException(result.reason, result.available);
    return result.adjustment;
  }
}
