import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { OutboxWriterService } from '../../../async-infrastructure/outbox/outbox-writer.service';
import { ReceiveStoreDropoffDto } from '../../presentation/dtos/receive-return-receipt.dto';
import {
  ReturnChannel,
  ReturnOrderStatus,
  ReturnInspectionStatus,
} from '../../domain/entities/return-policy.entity';

@Injectable()
export class ReceiveStoreDropoffUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly outboxWriter: OutboxWriterService,
  ) {}

  async execute(
    returnOrderId: string,
    operatorUserId: string,
    dto: ReceiveStoreDropoffDto = {},
    targetStoreLocationId?: string,
  ) {
    const returnOrder = await this.prisma.returnOrder.findUnique({
      where: { id: returnOrderId },
      include: {
        items: true,
        dropoffLocation: true,
      },
    });

    if (!returnOrder) {
      throw new NotFoundException(
        `Không tìm thấy hồ sơ đổi trả với ID: ${returnOrderId}`,
      );
    }

    if (returnOrder.returnChannel !== ReturnChannel.STORE_DROPOFF) {
      throw new BadRequestException(
        'Hồ sơ đổi trả này không đăng ký hình thức mang hàng trả tại Showroom',
      );
    }

    // 1. Kiểm tra trạng thái RMA: Chỉ cho phép SUBMITTED, APPROVED, AWAITING_RETURN
    const validReceivingStatuses = [
      ReturnOrderStatus.SUBMITTED,
      ReturnOrderStatus.APPROVED,
      'AWAITING_RETURN',
    ];

    if (!validReceivingStatuses.includes(returnOrder.status as any)) {
      throw new ConflictException(
        `Không thể tiếp nhận hồ sơ đổi trả đang ở trạng thái "${returnOrder.status}". Chỉ hỗ trợ khi hồ sơ ở trạng thái SUBMITTED hoặc APPROVED`,
      );
    }

    // 2. Xác định Showroom tiếp nhận thực tế
    const locationId =
      targetStoreLocationId ||
      returnOrder.dropoffLocationId ||
      returnOrder.storeId;

    const receiptCode = this.generateReceiptCode();
    const totalItemsCount = returnOrder.items.reduce(
      (sum, item) => sum + item.quantity,
      0,
    );

    // 3. Thực thi Transaction ACID: Tạo ReturnReceipt, cập nhật Quarantined Inventory, đổi trạng thái & ghi Outbox
    const result = await this.prisma.$transaction(async (tx) => {
      // 3.1. Tạo phiếu tiếp nhận hàng hoàn
      const receipt = await tx.returnReceipt.create({
        data: {
          receiptCode,
          returnOrderId: returnOrder.id,
          locationId,
          receivedBy: operatorUserId,
          receivedItemsCount: dto.receivedItemsCount ?? totalItemsCount,
          packageConditionNote:
            dto.packageConditionNote ||
            'Bao bì nguyên vẹn, khách mang sản phẩm đến Showroom đối chiếu',
        },
      });

      // 3.2. Cập nhật tồn kho: Tăng quantity và quarantinedQuantity, KHÔNG tăng availableQuantity
      for (const item of returnOrder.items) {
        await tx.inventory.upsert({
          where: {
            storeId_productVariantId: {
              storeId: locationId,
              productVariantId: item.productVariantId,
            },
          },
          update: {
            quantity: { increment: item.quantity },
            quarantinedQuantity: { increment: item.quantity },
          },
          create: {
            storeId: locationId,
            productVariantId: item.productVariantId,
            quantity: item.quantity,
            quarantinedQuantity: item.quantity,
            reservedQuantity: 0,
            safetyStock: 0,
            damagedQuantity: 0,
          },
        });

        // Ghi nhật ký giao dịch kho
        await tx.inventoryTransaction.create({
          data: {
            storeId: locationId,
            productVariantId: item.productVariantId,
            transactionType: 'RETURN_INBOUND',
            quantity: item.quantity,
            referenceType: 'RETURN_RECEIPT',
            referenceId: receipt.id,
            note: `Tiếp nhận hàng hoàn tại Showroom - Phiếu ${receipt.receiptCode}`,
            createdBy: operatorUserId,
          },
        });
      }

      // 3.3. Cập nhật trạng thái ReturnOrder sang RECEIVED
      const updatedReturnOrder = await tx.returnOrder.update({
        where: { id: returnOrder.id },
        data: {
          status: ReturnOrderStatus.RECEIVED,
          handledBy: operatorUserId,
          items: {
            updateMany: {
              where: { returnOrderId: returnOrder.id },
              data: { inspectionStatus: ReturnInspectionStatus.PENDING },
            },
          },
        },
        include: {
          items: true,
          receipts: true,
        },
      });

      // 3.4. Ghi Outbox Event: RMA_RECEIVED_AT_STORE
      await this.outboxWriter.record(tx, {
        aggregateType: 'RETURN_ORDER',
        aggregateId: returnOrder.id,
        eventType: 'RMA_RECEIVED_AT_STORE',
        payload: {
          receiptId: receipt.id,
          receiptCode: receipt.receiptCode,
          returnOrderId: returnOrder.id,
          returnCode: returnOrder.returnCode,
          locationId,
          receivedBy: operatorUserId,
          receivedItemsCount: receipt.receivedItemsCount,
          packageConditionNote: receipt.packageConditionNote,
          receivedAt: (receipt.createdAt || new Date()).toISOString(),
        },
      });

      return { receipt, returnOrder: updatedReturnOrder };
    });

    return result;
  }

  private generateReceiptCode(): string {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    return `RCP-${today}-${randomSuffix}`;
  }
}
