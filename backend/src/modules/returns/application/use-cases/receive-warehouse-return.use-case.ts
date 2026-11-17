import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { OutboxWriterService } from '../../../async-infrastructure/outbox/outbox-writer.service';
import { ReceiveWarehouseReturnDto } from '../../presentation/dtos/receive-warehouse-return.dto';
import {
  ReturnOrderStatus,
  ReturnInspectionStatus,
} from '../../domain/entities/return-policy.entity';

@Injectable()
export class ReceiveWarehouseReturnUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly outboxWriter: OutboxWriterService,
  ) {}

  /**
   * Tiếp nhận kiện hàng hoàn thu hồi tại Tổng kho từ shipper (EP14-T03)
   * Hỗ trợ tìm kiếm theo ID hồ sơ, returnCode hoặc trackingCode bưu tá
   */
  async execute(
    identifier: string,
    operatorUserId: string,
    dto: ReceiveWarehouseReturnDto = {},
  ) {
    // 1. Quét tìm hồ sơ ReturnOrder theo ID (nếu là UUID hợp lệ), returnCode hoặc trackingCode
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        identifier,
      );

    const orConditions: any[] = [
      { returnCode: identifier },
      { shipments: { some: { trackingCode: identifier } } },
    ];

    if (isUuid) {
      orConditions.push({ id: identifier });
    }

    const returnOrder = await this.prisma.returnOrder.findFirst({
      where: {
        OR: orConditions,
      },
      include: {
        items: true,
        shipments: {
          where: { shipmentType: 'RETURN_PICKUP' },
        },
      },
    });

    if (!returnOrder) {
      throw new NotFoundException(
        `Không tìm thấy hồ sơ đổi trả phù hợp với mã: ${identifier}`,
      );
    }

    // 2. Kiểm tra trạng thái hồ sơ: Phải ở trạng thái luân chuyển hoặc đã duyệt
    const validReceivingStatuses = [
      ReturnOrderStatus.APPROVED,
      ReturnOrderStatus.SUBMITTED,
      'IN_TRANSIT',
      'AWAITING_PICKUP',
    ];

    if (!validReceivingStatuses.includes(returnOrder.status as any)) {
      throw new ConflictException(
        `Hồ sơ đổi trả đang ở trạng thái "${returnOrder.status}", không thể thực hiện tiếp nhận tại Tổng kho`,
      );
    }

    // 3. Xác định Tổng kho nhận hàng
    let warehouseId = dto.warehouseId;
    if (!warehouseId) {
      const warehouse = await this.prisma.store.findFirst({
        where: { type: 'WAREHOUSE', isActive: true },
      });
      warehouseId = warehouse?.id || returnOrder.storeId;
    }

    const receiptCode = `RCP-WH-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
    const totalItemsCount = returnOrder.items.reduce(
      (sum, item) => sum + item.quantity,
      0,
    );

    // 4. Giao dịch ACID: Tạo phiếu nhận, đưa hàng vào Quarantined Inventory, hoàn tất vận đơn thu hồi & ghi Outbox
    const result = await this.prisma.$transaction(async (tx) => {
      // 4.1. Tạo phiếu tiếp nhận hàng hoàn tại Tổng kho
      const receipt = await tx.returnReceipt.create({
        data: {
          receiptCode,
          returnOrderId: returnOrder.id,
          locationId: warehouseId,
          receivedBy: operatorUserId,
          receivedItemsCount: dto.receivedItemsCount ?? totalItemsCount,
          packageConditionNote:
            dto.packageConditionNote ||
            'Kiện hàng hoàn về từ bưu tá GHN, bao bì nguyên niêm phong',
        },
      });

      // 4.2. Cập nhật tồn kho Tổng kho: Tăng quantity và quarantinedQuantity, KHÔNG tăng availableQuantity bán lẻ
      for (const item of returnOrder.items) {
        await tx.inventory.upsert({
          where: {
            storeId_productVariantId: {
              storeId: warehouseId,
              productVariantId: item.productVariantId,
            },
          },
          update: {
            quantity: { increment: item.quantity },
            quarantinedQuantity: { increment: item.quantity },
          },
          create: {
            storeId: warehouseId,
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
            storeId: warehouseId,
            productVariantId: item.productVariantId,
            transactionType: 'RETURN_INBOUND',
            quantity: item.quantity,
            referenceType: 'RETURN_RECEIPT',
            referenceId: receipt.id,
            note: `Nhập kho hàng hoàn tại Tổng kho - Phiếu ${receipt.receiptCode}`,
            createdBy: operatorUserId,
          },
        });
      }

      // 4.3. Cập nhật trạng thái vận đơn thu hồi (nếu có)
      const matchingShipment = returnOrder.shipments.find(
        (s) => !['CANCELLED', 'FAILED'].includes(s.status),
      );

      if (matchingShipment) {
        await tx.shipment.update({
          where: { id: matchingShipment.id },
          data: {
            status: 'DELIVERED',
            deliveredAt: new Date(),
          },
        });
      }

      // 4.4. Cập nhật ReturnOrder sang trạng thái RECEIVED và gán inspectionStatus = PENDING
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
          shipments: true,
        },
      });

      // 4.5. Ghi Outbox Event: RMA_RECEIVED_AT_WAREHOUSE
      await this.outboxWriter.record(tx, {
        aggregateType: 'RETURN_ORDER',
        aggregateId: returnOrder.id,
        eventType: 'RMA_RECEIVED_AT_WAREHOUSE',
        payload: {
          receiptId: receipt.id,
          receiptCode: receipt.receiptCode,
          returnOrderId: returnOrder.id,
          returnCode: returnOrder.returnCode,
          warehouseId,
          receivedBy: operatorUserId,
          receivedItemsCount: receipt.receivedItemsCount,
          packageConditionNote: receipt.packageConditionNote,
          trackingCode: matchingShipment?.trackingCode,
          receivedAt: (receipt.createdAt || new Date()).toISOString(),
        },
      });

      return { receipt, returnOrder: updatedReturnOrder };
    });

    return result;
  }
}
