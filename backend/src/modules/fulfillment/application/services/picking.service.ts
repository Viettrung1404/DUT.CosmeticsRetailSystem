import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Optional,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { AuditLogService } from '@core/services/audit-log.service';
import { OrderStateAggregator } from '@modules/oms/application/services/order-state-aggregator';
import {
  CompletePickingDto,
  PickListResponseDto,
  PickListItemDto,
} from '../../presentation/dtos/picking.dto';

@Injectable()
export class PickingService {
  private readonly logger = new Logger(PickingService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional()
    private readonly auditLogService?: AuditLogService,
    @Optional()
    private readonly orderStateAggregator?: OrderStateAggregator,
  ) {}

  /**
   * Lấy danh sách sản phẩm và mã lô FEFO chỉ định cần nhặt cho một FulfillmentOrder
   */
  async getPickList(fulfillmentOrderId: string): Promise<PickListResponseDto> {
    const fo = await this.prisma.fulfillmentOrder.findUnique({
      where: { id: fulfillmentOrderId },
      include: {
        sourceLocation: true,
        items: {
          include: {
            variant: {
              include: {
                product: true,
              },
            },
          },
        },
        reservation: {
          include: {
            items: {
              include: {
                lot: true,
                variant: {
                  include: {
                    product: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!fo) {
      throw new NotFoundException(`Không tìm thấy FulfillmentOrder với ID: ${fulfillmentOrderId}`);
    }

    const items: PickListItemDto[] = [];

    if (fo.reservation && fo.reservation.items.length > 0) {
      for (const resItem of fo.reservation.items) {
        items.push({
          variantId: resItem.productVariantId,
          sku: resItem.variant.sku,
          productName: resItem.variant.product.name,
          barcode: resItem.variant.barcode,
          lotId: resItem.lotId,
          batchCode: resItem.lot.batchCode,
          expiryDate: resItem.lot.expiryDate,
          quantity: resItem.quantity,
        });
      }
    } else {
      // Fallback nếu chưa có reservation items chi tiết
      for (const item of fo.items) {
        items.push({
          variantId: item.productVariantId,
          sku: item.variant.sku,
          productName: item.variant.product.name,
          barcode: item.variant.barcode,
          lotId: 'N/A',
          batchCode: 'UNASSIGNED',
          expiryDate: new Date(),
          quantity: item.quantityRequested,
        });
      }
    }

    return {
      fulfillmentOrderId: fo.id,
      fulfillmentOrderNumber: fo.fulfillmentOrderNumber,
      sourceLocationId: fo.sourceLocationId,
      sourceLocationName: fo.sourceLocation.name,
      status: fo.status,
      totalItemsCount: fo.totalItemsCount,
      items,
    };
  }

  /**
   * Bắt đầu quy trình nhặt hàng: Chuyển trạng thái từ ALLOCATED -> PICKING
   * DES-07 EP11-T03: Hỗ trợ OCC qua expectedVersion và ghi Universal Audit Log
   */
  async startPicking(
    fulfillmentOrderId: string,
    pickerId?: string,
    expectedVersion?: number,
  ): Promise<{ success: boolean; status: string; assignedPickerId?: string | null }> {
    const fo = await this.prisma.fulfillmentOrder.findUnique({
      where: { id: fulfillmentOrderId },
    });

    if (!fo) {
      throw new NotFoundException(`Không tìm thấy FulfillmentOrder với ID: ${fulfillmentOrderId}`);
    }

    // OCC: Kiểm tra version nếu client cung cấp expectedVersion (AC1)
    if (expectedVersion !== undefined && fo.version !== expectedVersion) {
      throw new ConflictException({
        statusCode: 409,
        errorCode: 'CONCURRENT_MODIFICATION_DETECTED',
        message: 'Dữ liệu đơn hàng đã bị cập nhật bởi người dùng khác. Vui lòng tải lại trang.',
      });
    }

    // Idempotent: Nếu đã ở trạng thái PICKING
    if (fo.status === 'PICKING') {
      return {
        success: true,
        status: 'PICKING',
        assignedPickerId: fo.assignedPickerId,
      };
    }

    if (fo.status !== 'ALLOCATED') {
      throw new ConflictException(
        `Không thể bắt đầu nhặt hàng khi FulfillmentOrder đang ở trạng thái ${fo.status}. Trạng thái hợp lệ: ALLOCATED`,
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const res = await tx.fulfillmentOrder.update({
        where: { id: fulfillmentOrderId },
        data: {
          status: 'PICKING',
          assignedPickerId: pickerId || fo.assignedPickerId,
          version: { increment: 1 },
        },
      });

      // Ghi Universal Audit Log
      if (this.auditLogService) {
        await this.auditLogService.recordTransition(tx, {
          entityType: 'FULFILLMENT_ORDER',
          entityId: fo.id,
          fromStatus: fo.status,
          toStatus: 'PICKING',
          action: 'START_PICKING',
          actorType: 'ADMIN_USER',
          actorId: pickerId || null,
        });
      }

      if (this.orderStateAggregator) {
        await this.orderStateAggregator.computeOrderStatus(fo.orderId, tx, {
          changedBy: pickerId,
          note: `Bắt đầu nhặt hàng cho kiện ${fo.fulfillmentOrderNumber}`,
        });
      }

      return res;
    });

    this.logger.log(
      `FulfillmentOrder ${fo.fulfillmentOrderNumber} đã chuyển sang PICKING bởi nhân viên ${pickerId || 'N/A'} (v${updated.version})`,
    );

    return {
      success: true,
      status: updated.status,
      assignedPickerId: updated.assignedPickerId,
    };
  }

  /**
   * Hoàn thành nhặt hàng: Đối chiếu mã lô (Batch Code), mã vạch và số lượng với InventoryReservation
   * AC1: Quét sai mã lô (Batch Code) hệ thống báo lỗi BATCH_MISMATCH và từ chối hoàn thành
   * AC2: Quét đủ số lượng và đúng lô -> FO chuyển sang PICKED
   */
  async completePicking(
    fulfillmentOrderId: string,
    dto: CompletePickingDto,
    pickerId?: string,
  ): Promise<{
    success: boolean;
    status: string;
    pickedAt: Date;
    fulfillmentOrderId: string;
  }> {
    const fo = await this.prisma.fulfillmentOrder.findUnique({
      where: { id: fulfillmentOrderId },
      include: {
        items: true,
        reservation: {
          include: {
            items: {
              include: {
                lot: true,
                variant: true,
              },
            },
          },
        },
      },
    });

    if (!fo) {
      throw new NotFoundException(`Không tìm thấy FulfillmentOrder với ID: ${fulfillmentOrderId}`);
    }

    // OCC: Kiểm tra version nếu client cung cấp expectedVersion (AC1)
    if (dto.expectedVersion !== undefined && fo.version !== dto.expectedVersion) {
      throw new ConflictException({
        statusCode: 409,
        errorCode: 'CONCURRENT_MODIFICATION_DETECTED',
        message: 'Dữ liệu đơn hàng đã bị cập nhật bởi người dùng khác. Vui lòng tải lại trang.',
      });
    }

    // Idempotent nếu đã hoàn thành nhặt hàng
    if (fo.status === 'PICKED') {
      return {
        success: true,
        status: 'PICKED',
        pickedAt: fo.pickedAt || new Date(),
        fulfillmentOrderId: fo.id,
      };
    }

    if (fo.status !== 'PICKING') {
      throw new BadRequestException(
        `FulfillmentOrder phải ở trạng thái PICKING để hoàn thành nhặt hàng. Trạng thái hiện tại: ${fo.status}`,
      );
    }

    if (fo.reservation && fo.reservation.items.length > 0) {
      // 1. Xây dựng bản đồ phân bổ mong đợi (Expected Allocation) từ reservation items
      // Key: `${variantId}_${batchCode}` -> expectedQuantity
      const expectedMap = new Map<string, number>();
      const expectedVariants = new Set<string>();

      for (const resItem of fo.reservation.items) {
        const key = `${resItem.productVariantId}_${resItem.lot.batchCode}`;
        expectedMap.set(key, (expectedMap.get(key) || 0) + resItem.quantity);
        expectedVariants.add(resItem.productVariantId);
      }

      // 2. Xây dựng bản đồ thực tế quét được (Scanned Items)
      const scannedMap = new Map<string, number>();

      for (const scanned of dto.items) {
        // Kiểm tra xem sản phẩm có trong đơn không
        if (!expectedVariants.has(scanned.variantId)) {
          throw new BadRequestException(
            `ITEM_NOT_FOUND_IN_ORDER: Sản phẩm ${scanned.variantId} không thuộc FulfillmentOrder này!`,
          );
        }

        const key = `${scanned.variantId}_${scanned.batchCode}`;

        // AC1: Kiểm tra mã lô có trùng khớp với lô được hệ thống FEFO chỉ định không
        if (!expectedMap.has(key)) {
          throw new BadRequestException(
            `BATCH_MISMATCH: Mã lô '${scanned.batchCode}' cho sản phẩm ${scanned.variantId} không khớp với lô hàng được phân bổ! Vui lòng nhặt đúng lô hàng theo danh sách FEFO.`,
          );
        }

        scannedMap.set(key, (scannedMap.get(key) || 0) + scanned.quantity);
      }

      // 3. Đối chiếu số lượng từng lô giữa thực tế quét và kế hoạch
      for (const [key, expectedQty] of expectedMap.entries()) {
        const scannedQty = scannedMap.get(key) || 0;
        if (scannedQty !== expectedQty) {
          const [variantId, batchCode] = key.split('_');
          throw new BadRequestException(
            `QUANTITY_MISMATCH: Số lượng quét không khớp cho sản phẩm ${variantId}, lô ${batchCode}. Yêu cầu: ${expectedQty}, Thực quét: ${scannedQty}`,
          );
        }
      }

      // Đảm bảo không quét thừa các lô ngoài danh sách
      for (const [key] of scannedMap.entries()) {
        if (!expectedMap.has(key)) {
          const [, batchCode] = key.split('_');
          throw new BadRequestException(
            `BATCH_MISMATCH: Lô ${batchCode} không nằm trong danh sách phân bổ!`,
          );
        }
      }
    } else {
      // Fallback khi đơn hàng chưa gắn reservation items chi tiết: Đối chiếu theo fo.items
      const expectedMap = new Map<string, number>();
      for (const item of fo.items) {
        expectedMap.set(
          item.productVariantId,
          (expectedMap.get(item.productVariantId) || 0) + item.quantityRequested,
        );
      }

      const scannedMap = new Map<string, number>();
      for (const scanned of dto.items) {
        if (!expectedMap.has(scanned.variantId)) {
          throw new BadRequestException(
            `ITEM_NOT_FOUND_IN_ORDER: Sản phẩm ${scanned.variantId} không thuộc FulfillmentOrder này!`,
          );
        }
        scannedMap.set(
          scanned.variantId,
          (scannedMap.get(scanned.variantId) || 0) + scanned.quantity,
        );
      }

      for (const [variantId, expectedQty] of expectedMap.entries()) {
        const scannedQty = scannedMap.get(variantId) || 0;
        if (scannedQty !== expectedQty) {
          throw new BadRequestException(
            `QUANTITY_MISMATCH: Số lượng quét không khớp cho sản phẩm ${variantId}. Yêu cầu: ${expectedQty}, Thực quét: ${scannedQty}`,
          );
        }
      }
    }

    // 4. AC2: Mọi kiểm tra hợp lệ -> Cập nhật trạng thái FO sang PICKED trong Transaction
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.fulfillmentOrder.update({
        where: { id: fulfillmentOrderId },
        data: {
          status: 'PICKED',
          pickedAt: now,
          assignedPickerId: pickerId || fo.assignedPickerId,
          version: { increment: 1 },
        },
      });

      // Ghi Universal Audit Log
      if (this.auditLogService) {
        await this.auditLogService.recordTransition(tx, {
          entityType: 'FULFILLMENT_ORDER',
          entityId: fo.id,
          fromStatus: fo.status,
          toStatus: 'PICKED',
          action: 'COMPLETE_PICKING',
          actorType: 'ADMIN_USER',
          actorId: pickerId || null,
        });
      }

      // Cập nhật quantityFulfilled trên fulfillment_order_items
      for (const foItem of fo.items) {
        await tx.fulfillmentOrderItem.update({
          where: { id: foItem.id },
          data: {
            quantityFulfilled: foItem.quantityRequested,
          },
        });
      }

      if (this.orderStateAggregator) {
        await this.orderStateAggregator.computeOrderStatus(fo.orderId, tx, {
          changedBy: pickerId,
          note: `Hoàn tất nhặt hàng FEFO cho kiện ${fo.fulfillmentOrderNumber}`,
        });
      }
    });

    this.logger.log(
      `FulfillmentOrder ${fo.fulfillmentOrderNumber} đã hoàn thành nhặt hàng thành công (PICKED) lúc ${now.toISOString()}`,
    );

    return {
      success: true,
      status: 'PICKED',
      pickedAt: now,
      fulfillmentOrderId: fo.id,
    };
  }
}
