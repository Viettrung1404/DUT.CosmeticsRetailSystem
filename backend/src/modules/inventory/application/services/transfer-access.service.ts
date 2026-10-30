import { ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  DataScope,
  GetUserDataScopeUseCase,
} from '@modules/permissions/application/use-cases/get-user-data-scope.use-case';
import { isStoreInScope } from '@modules/permissions/application/utils/store-scope.util';
import {
  ITransferRepository,
  TRANSFER_REPOSITORY,
  TransferView,
} from '../../domain/repositories/transfer.repository.interface';

export type TransferSide = 'FROM' | 'TO' | 'EITHER';

// Bên nào được thao tác bước nào (V11): QL cửa hàng nhận lập/gửi/nhận, NV kho tổng duyệt/xuất
@Injectable()
export class TransferAccessService {
  constructor(
    @Inject(TRANSFER_REPOSITORY) readonly repository: ITransferRepository,
    private readonly getUserDataScope: GetUserDataScopeUseCase,
  ) {}

  scopeOf(userId: string): Promise<DataScope> {
    return this.getUserDataScope.execute(userId);
  }

  async load(
    userId: string,
    id: string,
    side: TransferSide,
    expectedStatus?: string[],
  ): Promise<TransferView> {
    const transfer = await this.repository.findById(id);
    if (!transfer) throw new NotFoundException('Không tìm thấy phiếu chuyển kho');
    const scope = await this.scopeOf(userId);
    const fromOk = isStoreInScope(scope, transfer.fromStoreId);
    const toOk = isStoreInScope(scope, transfer.toStoreId);
    const allowed = side === 'FROM' ? fromOk : side === 'TO' ? toOk : fromOk || toOk;
    if (!allowed) {
      throw new ForbiddenException(
        side === 'FROM'
          ? 'Chỉ nhân viên kho xuất được thao tác bước này'
          : side === 'TO'
            ? 'Chỉ cửa hàng nhận được thao tác bước này'
            : 'Phiếu chuyển kho ngoài phạm vi của bạn',
      );
    }
    if (expectedStatus && !expectedStatus.includes(transfer.status)) {
      throw new ConflictException(`Phiếu đang ở trạng thái ${transfer.status}, không thực hiện được bước này`);
    }
    return transfer;
  }

  async reload(id: string): Promise<TransferView> {
    return (await this.repository.findById(id))!;
  }

  statusChanged(): ConflictException {
    return new ConflictException('Phiếu vừa được người khác xử lý, tải lại để xem trạng thái mới');
  }
}
