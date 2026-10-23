import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { GetUserDataScopeUseCase } from '@modules/permissions/application/use-cases/get-user-data-scope.use-case';
import { isStoreInScope } from '@modules/permissions/application/utils/store-scope.util';
import { PosReceipt } from '../../domain/entities/pos-sale.entity';
import {
  IPosOrderRepository,
  POS_ORDER_REPOSITORY,
} from '../../domain/repositories/pos-order.repository.interface';

@Injectable()
export class GetPosOrderReceiptUseCase {
  constructor(
    @Inject(POS_ORDER_REPOSITORY)
    private readonly repository: IPosOrderRepository,
    private readonly getUserDataScope: GetUserDataScopeUseCase,
  ) {}

  async execute(userId: string, permissionCodes: string[], orderId: string): Promise<PosReceipt> {
    const receipt = await this.repository.findReceipt(orderId);
    if (!receipt) {
      throw new NotFoundException('Không tìm thấy đơn bán tại quầy');
    }

    // V3: nhân viên bán hàng chỉ xem đơn trong ca của chính mình; quản lý / kế toán (có quyền đối soát) xem theo phạm vi
    if (receipt.session?.cashierId === userId) {
      return receipt;
    }
    if (permissionCodes.includes('PAYMENT_RECONCILE')) {
      const scope = await this.getUserDataScope.execute(userId);
      if (isStoreInScope(scope, receipt.storeId)) {
        return receipt;
      }
    }
    throw new ForbiddenException('Bạn chỉ xem được biên lai của đơn trong ca của chính mình');
  }
}
