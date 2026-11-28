import { Injectable, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ReturnDisposition } from '../../domain/entities/return-policy.entity';

export interface ExecuteDispositionParams {
  locationId: string;
  productVariantId: string;
  lotId?: string;
  returnItemId?: string;
  disposition: ReturnDisposition | string;
  quantity: number;
  operatorUserId?: string;
  notes?: string;
}

@Injectable()
export class InventoryDispositionService {
  /**
   * Thực thi định đoạt tồn kho trong cùng transaction ACID (EP15-T02)
   */
  async executeItemDisposition(
    tx: Prisma.TransactionClient,
    params: ExecuteDispositionParams,
  ) {
    const {
      locationId,
      productVariantId,
      lotId,
      returnItemId,
      disposition,
      quantity,
      operatorUserId,
      notes,
    } = params;

    if (quantity <= 0) {
      throw new BadRequestException('Số lượng định đoạt tồn kho phải lớn hơn 0');
    }

    const dispositionCode = this.generateDispositionCode();

    // 1. Cập nhật tồn kho theo loại hình định đoạt (Disposition Type)
    switch (disposition) {
      case ReturnDisposition.RESTOCK:
        // AC1: RESTOCK - Giảm quarantined_quantity, hàng trở lại trạng thái khả dụng (available_quantity tăng tự động)
        await tx.inventory.update({
          where: {
            storeId_productVariantId: {
              storeId: locationId,
              productVariantId,
            },
          },
          data: {
            quarantinedQuantity: { decrement: quantity },
          },
        });

        // Nếu có thông tin Lô (InventoryLot), tăng lại tồn kho lô
        if (lotId) {
          await tx.inventoryLot.update({
            where: { id: lotId },
            data: {
              quantityOnHand: { increment: quantity },
            },
          });
        }

        // Ghi nhật ký giao dịch kho
        await tx.inventoryTransaction.create({
          data: {
            storeId: locationId,
            productVariantId,
            transactionType: 'RETURN_RESTOCK',
            quantity,
            referenceType: 'INVENTORY_DISPOSITION',
            note: notes || 'Nhập lại kho bán lẻ sau kiểm định KCS đạt chuẩn',
            createdBy: operatorUserId,
          },
        });
        break;

      case ReturnDisposition.SCRAP:
        // AC2: SCRAP - Giảm quarantined_quantity, tăng damaged_quantity (tuyệt đối KHÔNG tăng available_quantity bán lẻ)
        await tx.inventory.update({
          where: {
            storeId_productVariantId: {
              storeId: locationId,
              productVariantId,
            },
          },
          data: {
            quarantinedQuantity: { decrement: quantity },
            damagedQuantity: { increment: quantity },
          },
        });

        await tx.inventoryTransaction.create({
          data: {
            storeId: locationId,
            productVariantId,
            transactionType: 'RETURN_SCRAP',
            quantity,
            referenceType: 'INVENTORY_DISPOSITION',
            note: notes || 'Tiêu hủy / thanh lý hàng hỏng sau kiểm định KCS',
            createdBy: operatorUserId,
          },
        });
        break;

      case ReturnDisposition.RETURN_TO_CUSTOMER:
        // AC3: RETURN_TO_CUSTOMER - Hàng từ chối đổi trả trả lại cho khách (xuất khỏi kho vật lý)
        await tx.inventory.update({
          where: {
            storeId_productVariantId: {
              storeId: locationId,
              productVariantId,
            },
          },
          data: {
            quarantinedQuantity: { decrement: quantity },
            quantity: { decrement: quantity },
          },
        });

        await tx.inventoryTransaction.create({
          data: {
            storeId: locationId,
            productVariantId,
            transactionType: 'RETURN_REJECTED',
            quantity,
            referenceType: 'INVENTORY_DISPOSITION',
            note: notes || 'Xuất trả lại hàng cho khách sau khi bị từ chối kiểm định',
            createdBy: operatorUserId,
          },
        });
        break;

      case ReturnDisposition.QUARANTINE:
      default:
        // Tiếp tục giữ trong vùng cách ly chờ chỉ đạo hội đồng chuyên môn
        await tx.inventoryTransaction.create({
          data: {
            storeId: locationId,
            productVariantId,
            transactionType: 'RETURN_QUARANTINE',
            quantity,
            referenceType: 'INVENTORY_DISPOSITION',
            note: notes || 'Tiếp tục cách ly KCS chờ hội đồng y tế thẩm định',
            createdBy: operatorUserId,
          },
        });
        break;
    }

    // 2. Tạo bản ghi biên bản định đoạt tồn kho (inventory_dispositions)
    const dispositionRecord = await tx.inventoryDisposition.create({
      data: {
        dispositionCode,
        locationId,
        productVariantId,
        lotId: lotId || null,
        returnItemId: returnItemId || null,
        dispositionType: disposition,
        quantity,
        executedBy: operatorUserId || null,
        notes: notes || null,
      },
    });

    return dispositionRecord;
  }

  private generateDispositionCode(): string {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    return `DSP-${today}-${randomSuffix}`;
  }
}
