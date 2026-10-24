import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { GetUserDataScopeUseCase } from '@modules/permissions/application/use-cases/get-user-data-scope.use-case';
import { isStoreInScope } from '@modules/permissions/application/utils/store-scope.util';
import {
  AdjustmentCommand,
  INVENTORY_REPOSITORY,
  IInventoryRepository,
} from '../../domain/repositories/inventory.repository.interface';
import { startOfVnToday } from '../utils/vn-date.util';

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

@Injectable()
export class AdjustInventoryUseCase {
  constructor(
    @Inject(INVENTORY_REPOSITORY)
    private readonly repository: IInventoryRepository,
    private readonly getUserDataScope: GetUserDataScopeUseCase,
  ) {}

  async execute(userId: string, input: AdjustInventoryInput) {
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

    const command: AdjustmentCommand = {
      storeId: store.id,
      productVariantId: input.productVariantId,
      quantity: input.quantity,
      reason,
      createdBy: userId,
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
      command.newBatch = { batchNumber, expiryDate, manufactureDate };
    }

    const result = await this.repository.applyAdjustment(command);
    if (result.ok) {
      return {
        quantity: result.quantity,
        reservedQuantity: result.reservedQuantity,
        availableQuantity: result.quantity - result.reservedQuantity,
        allocations: result.allocations,
      };
    }

    switch (result.reason) {
      case 'NO_STOCK':
        throw new BadRequestException(
          `Không đủ hàng để xuất: tồn hiện có ${result.available ?? 0}`,
        );
      case 'RESERVED_CONFLICT':
        throw new ConflictException(
          `Chỉ xuất được tối đa ${result.available ?? 0} vì phần còn lại đang giữ chỗ cho đơn online`,
        );
      case 'BATCH_NOT_FOUND':
        throw new NotFoundException('Không tìm thấy lô này tại địa điểm đã chọn');
      case 'BATCH_SHORTAGE':
        throw new BadRequestException(`Lô đã chọn chỉ còn ${result.available ?? 0}`);
      default:
        throw new ConflictException('Số lô này đã có với hạn sử dụng khác, kiểm tra lại số lô');
    }
  }
}
