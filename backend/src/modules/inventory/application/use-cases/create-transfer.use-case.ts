import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { isStoreInScope } from '@modules/permissions/application/utils/store-scope.util';
import {
  INVENTORY_REPOSITORY,
  IInventoryRepository,
} from '../../domain/repositories/inventory.repository.interface';
import {
  ITransferRepository,
  TransferLineInput,
  TransferView,
} from '../../domain/repositories/transfer.repository.interface';
import { TransferAccessService } from '../services/transfer-access.service';

export const validateTransferLines = async (
  repository: ITransferRepository,
  items: TransferLineInput[],
): Promise<void> => {
  if (!items.length) throw new BadRequestException('Phiếu chuyển kho cần ít nhất một sản phẩm');
  const ids = items.map((i) => i.productVariantId);
  if (new Set(ids).size !== ids.length) {
    throw new BadRequestException('Mỗi sản phẩm chỉ ghi một dòng trên phiếu');
  }
  if ((await repository.findMissingVariants(ids)).length) {
    throw new NotFoundException('Có sản phẩm không tồn tại trong danh mục');
  }
};

// QL lập phiếu xin hàng từ kho tổng về cửa hàng mình; kiểm phạm vi theo nơi nhận
@Injectable()
export class CreateTransferUseCase {
  constructor(
    @Inject(INVENTORY_REPOSITORY) private readonly inventory: IInventoryRepository,
    private readonly access: TransferAccessService,
  ) {}

  async execute(
    userId: string,
    input: { fromStoreId: string; toStoreId: string; note?: string; items: TransferLineInput[] },
  ): Promise<TransferView> {
    if (input.fromStoreId === input.toStoreId) {
      throw new BadRequestException('Nơi xuất và nơi nhận phải khác nhau');
    }
    const [from, to] = await Promise.all([
      this.inventory.findStore(input.fromStoreId),
      this.inventory.findStore(input.toStoreId),
    ]);
    if (!from || !to) throw new NotFoundException('Không tìm thấy kho / cửa hàng');
    if (!from.isActive || !to.isActive) {
      throw new BadRequestException('Kho / cửa hàng đã ngừng hoạt động');
    }
    if (from.type !== 'WAREHOUSE') {
      throw new BadRequestException('Hàng chỉ được chuyển từ kho tổng');
    }
    if (to.type === 'WAREHOUSE') {
      throw new BadRequestException('Nơi nhận phải là cửa hàng');
    }
    const scope = await this.access.scopeOf(userId);
    if (!isStoreInScope(scope, to.id)) {
      throw new ForbiddenException('Bạn chỉ lập phiếu xin hàng cho cửa hàng mình phụ trách');
    }
    await validateTransferLines(this.access.repository, input.items);

    const id = await this.access.repository.create({
      fromStoreId: from.id,
      toStoreId: to.id,
      note: input.note?.trim() || null,
      requestedBy: userId,
      items: input.items,
    });
    return this.access.reload(id);
  }
}
