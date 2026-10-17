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
  INVENTORY_REPOSITORY,
  IInventoryRepository,
  ReceiptLine,
} from '../../domain/repositories/inventory.repository.interface';
import { startOfVnToday } from '../utils/vn-date.util';

export interface ReceiveItemInput {
  purchaseOrderItemId: string;
  quantity: number;
  batchNumber: string;
  expiryDate: string;
  manufactureDate?: string;
}

export interface ReceivePurchaseOrderInput {
  purchaseOrderId: string;
  items: ReceiveItemInput[];
  note?: string;
}

const RECEIVABLE_STATUSES = ['SENT', 'CONFIRMED', 'PARTIALLY_RECEIVED'];

const STATUS_MESSAGES: Record<string, string> = {
  DRAFT: 'Đơn đặt hàng chưa được duyệt nên chưa nhận hàng được',
  RECEIVED: 'Đơn đặt hàng đã nhận đủ hàng',
  CANCELLED: 'Đơn đặt hàng đã bị hủy',
};

@Injectable()
export class ReceivePurchaseOrderUseCase {
  constructor(
    @Inject(INVENTORY_REPOSITORY)
    private readonly repository: IInventoryRepository,
    private readonly getUserDataScope: GetUserDataScopeUseCase,
  ) {}

  async execute(userId: string, input: ReceivePurchaseOrderInput) {
    const po = await this.repository.findPurchaseOrder(input.purchaseOrderId);
    if (!po) {
      throw new NotFoundException('Không tìm thấy đơn đặt hàng');
    }

    const scope = await this.getUserDataScope.execute(userId);
    if (!isStoreInScope(scope, po.storeId)) {
      throw new ForbiddenException('Đơn đặt hàng giao về kho không thuộc phạm vi của bạn');
    }
    // V9: nhà cung cấp chỉ giao về kho tổng
    if (po.storeType !== 'WAREHOUSE') {
      throw new BadRequestException('Đơn đặt hàng phải giao về kho tổng mới nhận hàng được');
    }
    if (!RECEIVABLE_STATUSES.includes(po.status)) {
      throw new BadRequestException(
        STATUS_MESSAGES[po.status] ?? `Đơn đặt hàng đang ở trạng thái ${po.status}, không nhận hàng được`,
      );
    }

    const today = startOfVnToday();
    const receivingByItem = new Map<string, number>();
    const lines: ReceiptLine[] = input.items.map((item) => {
      const poItem = po.items.find((i) => i.id === item.purchaseOrderItemId);
      if (!poItem) {
        throw new BadRequestException('Có dòng hàng không thuộc đơn đặt hàng này');
      }

      const batchNumber = item.batchNumber.trim();
      if (!batchNumber) {
        throw new BadRequestException('Số lô không được để trống');
      }
      const expiryDate = new Date(`${item.expiryDate}T00:00:00Z`);
      if (expiryDate.getTime() <= today.getTime()) {
        throw new BadRequestException(`Lô ${batchNumber} đã hết hạn, không nhập kho được`);
      }
      const manufactureDate = item.manufactureDate
        ? new Date(`${item.manufactureDate}T00:00:00Z`)
        : null;
      if (manufactureDate && manufactureDate.getTime() >= expiryDate.getTime()) {
        throw new BadRequestException(`Lô ${batchNumber}: ngày sản xuất phải trước hạn sử dụng`);
      }

      receivingByItem.set(poItem.id, (receivingByItem.get(poItem.id) ?? 0) + item.quantity);
      return {
        purchaseOrderItemId: poItem.id,
        productVariantId: poItem.productVariantId,
        quantity: item.quantity,
        unitCost: poItem.unitCost,
        batchNumber,
        expiryDate,
        manufactureDate,
      };
    });

    for (const [itemId, receiving] of receivingByItem) {
      const poItem = po.items.find((i) => i.id === itemId)!;
      const remaining = poItem.quantityOrdered - poItem.quantityReceived;
      if (receiving > remaining) {
        throw new BadRequestException(
          `Số nhận vượt số đặt: dòng hàng còn ${remaining}, đang nhận ${receiving}`,
        );
      }
    }

    const result = await this.repository.applyReceipt({
      purchaseOrderId: po.id,
      storeId: po.storeId,
      supplierId: po.supplierId,
      lines,
      note: input.note?.trim() || null,
      receivedBy: userId,
      receivedDate: today,
    });

    if (!result.ok) {
      if (result.reason === 'BATCH_EXPIRY_MISMATCH') {
        throw new ConflictException(
          `Lô ${result.batchNumber} đã có trong kho với hạn sử dụng khác, kiểm tra lại số lô`,
        );
      }
      throw new ConflictException('Đơn đặt hàng vừa được người khác nhận hàng, vui lòng tải lại');
    }

    return { poNumber: po.poNumber, status: result.poStatus, receivedLines: lines.length };
  }
}
