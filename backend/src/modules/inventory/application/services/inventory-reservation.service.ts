import { Injectable, Inject, ConflictException, NotFoundException, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { FefoAllocationService, AllocatedLotItem } from './fefo-allocation.service';
import { IOutboxWriter, OUTBOX_WRITER } from '@modules/async-infrastructure';

export interface ReservationItemRequest {
  variantId: string;
  quantity: number;
  isClearance?: boolean;
}

export interface CreateReservationRequest {
  orderId?: string;
  fulfillmentOrderId?: string;
  locationId: string;
  items: ReservationItemRequest[];
  paymentMethod?: string; // 'COD', 'VNPAY', 'ONLINE', etc.
  ttlMinutes?: number; // Override TTL (phút)
  now?: Date; // Dành cho testing
}

export interface InventoryReservationDto {
  id: string;
  orderId?: string | null;
  fulfillmentOrderId?: string | null;
  locationId: string;
  status: string;
  expiresAt: Date;
  createdAt: Date;
  allocatedItems: {
    productVariantId: string;
    lotId: string;
    batchCode: string;
    quantity: number;
  }[];
}

export interface ReleaseReservationOptions {
  newStatus?: 'RELEASED' | 'EXPIRED';
  reason?: string;
  now?: Date;
}

export interface ReleaseReservationResult {
  reservationId: string;
  previousStatus: string;
  newStatus: string;
  releasedItems: {
    productVariantId: string;
    lotId: string;
    quantity: number;
  }[];
}

@Injectable()
export class InventoryReservationService {
  private readonly logger = new Logger(InventoryReservationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly fefoAllocationService: FefoAllocationService,
    @Inject(OUTBOX_WRITER)
    private readonly outboxWriter: IOutboxWriter,
  ) {}

  /**
   * Tạo bản ghi giữ chỗ tồn kho nguyên tử (Atomic Inventory Reservation)
   * Thực hiện tuần tự trong cùng một database transaction:
   * 1. Khóa và phân bổ các lô hàng theo FEFO (FefoAllocationService.allocateAndLockLots)
   * 2. Tạo bản ghi Header: InventoryReservation (status = 'ACTIVE', expiresAt = Now + 15m/30m)
   * 3. Tạo các bản ghi Detail: InventoryReservationItem (lưu lotId, variantId, quantity)
   * 4. Cập nhật tăng reserved_quantity trên bảng Inventory Balances (bảo đảm Zero Overselling qua DB Check Constraint)
   * 5. Ghi nhật ký vào sổ cái InventoryTransaction (loại RESERVATION_HOLD)
   * 6. Xuất bản Transactional Outbox Event: INVENTORY_RESERVED (chống mất sự kiện miền)
   * 
   * @param tx Prisma.TransactionClient bắt buộc để bảo toàn tính ACID
   * @param request Thông tin yêu cầu giữ chỗ
   * @returns InventoryReservationDto
   */
  async createReservation(
    tx: Prisma.TransactionClient,
    request: CreateReservationRequest,
  ): Promise<InventoryReservationDto> {
    const {
      orderId,
      fulfillmentOrderId,
      locationId,
      items,
      paymentMethod,
      ttlMinutes,
      now = new Date(),
    } = request;

    if (!items || items.length === 0) {
      throw new ConflictException('Danh sách mặt hàng giữ chỗ không được để trống.');
    }

    // 1. Tính toán thời hạn giữ chỗ (expiresAt) theo tiêu chuẩn DES-05 / DES-06:
    // - Mặc định: Thanh toán trực tuyến (VNPAY, Online) = 15 phút.
    // - Thanh toán khi nhận hàng (COD) = 30 phút.
    let resolvedTtlMinutes = ttlMinutes;
    if (!resolvedTtlMinutes) {
      const isCod = paymentMethod?.toUpperCase() === 'COD';
      resolvedTtlMinutes = isCod ? 30 : 15;
    }
    const expiresAt = new Date(now.getTime() + resolvedTtlMinutes * 60 * 1000);

    // 2. Phân bổ và khóa các lô hàng theo thuật toán FEFO
    const allocatedLots = await this.fefoAllocationService.allocateAndLockLots(
      tx,
      locationId,
      items,
      { now },
    );

    // 3. Tạo bản ghi InventoryReservation Header
    const reservation = await tx.inventoryReservation.create({
      data: {
        orderId,
        fulfillmentOrderId,
        locationId,
        status: 'ACTIVE',
        expiresAt,
      },
    });

    // 4. Tạo chi tiết InventoryReservationItem gắn với từng lô
    await tx.inventoryReservationItem.createMany({
      data: allocatedLots.map((alloc) => ({
        reservationId: reservation.id,
        productVariantId: alloc.variantId,
        lotId: alloc.lotId,
        quantity: alloc.quantity,
      })),
    });

    // 5. Cập nhật tăng reserved_quantity trên bảng inventory (Inventory Balances)
    // Tính tổng số lượng giữ chỗ theo từng variantId
    const variantTotalQtyMap = new Map<string, number>();
    for (const alloc of allocatedLots) {
      variantTotalQtyMap.set(
        alloc.variantId,
        (variantTotalQtyMap.get(alloc.variantId) || 0) + alloc.quantity,
      );
    }

    for (const [variantId, totalQty] of variantTotalQtyMap.entries()) {
      // Cập nhật số dư tổng. Nếu vi phạm chk_inventory_balances_logical, DB sẽ ném mã lỗi 23514
      await tx.inventory.update({
        where: {
          storeId_productVariantId: {
            storeId: locationId,
            productVariantId: variantId,
          },
        },
        data: {
          reservedQuantity: { increment: totalQty },
        },
      });

      // 6. Ghi sổ cái InventoryTransaction (loại RESERVATION_HOLD)
      await tx.inventoryTransaction.create({
        data: {
          storeId: locationId,
          productVariantId: variantId,
          transactionType: 'RESERVATION_HOLD',
          quantity: totalQty,
          referenceType: 'INVENTORY_RESERVATION',
          referenceId: reservation.id,
          note: `Giữ chỗ tồn kho FEFO cho Reservation ${reservation.id} (Order: ${orderId || 'N/A'})`,
        },
      });
    }

    // 7. Ghi nhận Transactional Outbox Event trong cùng transaction
    await this.outboxWriter.record(tx, {
      id: randomUUID(),
      aggregateType: 'INVENTORY_RESERVATION',
      aggregateId: reservation.id,
      eventType: 'INVENTORY_RESERVED',
      payload: {
        reservationId: reservation.id,
        orderId,
        fulfillmentOrderId,
        locationId,
        status: 'ACTIVE',
        expiresAt: expiresAt.toISOString(),
        items: allocatedLots.map((a) => ({
          variantId: a.variantId,
          lotId: a.lotId,
          batchCode: a.batchCode,
          quantity: a.quantity,
        })),
      },
      occurredAt: now,
    });

    this.logger.log(
      `Đã tạo InventoryReservation ${reservation.id} thành công cho location ${locationId}. Tổng ${allocatedLots.length} allocation items. Hết hạn lúc ${expiresAt.toISOString()}.`,
    );

    return {
      id: reservation.id,
      orderId: reservation.orderId,
      fulfillmentOrderId: reservation.fulfillmentOrderId,
      locationId: reservation.locationId,
      status: reservation.status,
      expiresAt: reservation.expiresAt,
      createdAt: reservation.createdAt,
      allocatedItems: allocatedLots.map((a) => ({
        productVariantId: a.variantId,
        lotId: a.lotId,
        batchCode: a.batchCode,
        quantity: a.quantity,
      })),
    };
  }

  /**
   * Truy vấn thông tin chi tiết một bản ghi giữ chỗ kèm danh sách các lô hàng.
   */
  async getReservation(
    id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<InventoryReservationDto | null> {
    const client = tx || this.prisma;
    const reservation = await client.inventoryReservation.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            lot: {
              select: { batchCode: true },
            },
          },
        },
      },
    });

    if (!reservation) {
      return null;
    }

    return {
      id: reservation.id,
      orderId: reservation.orderId,
      fulfillmentOrderId: reservation.fulfillmentOrderId,
      locationId: reservation.locationId,
      status: reservation.status,
      expiresAt: reservation.expiresAt,
      createdAt: reservation.createdAt,
      allocatedItems: reservation.items.map((item) => ({
        productVariantId: item.productVariantId,
        lotId: item.lotId,
        batchCode: item.lot.batchCode,
        quantity: item.quantity,
      })),
    };
  }

  /**
   * Giải phóng số lượng giữ chỗ tồn kho (Release Reservation)
   * Sử dụng khi đơn hàng bị hủy, thanh toán thất bại, hoặc hết hạn (Expired).
   * 
   * Quy trình ACID trong cùng Transaction:
   * 1. Khóa bi quan bản ghi reservation qua SELECT ... FOR UPDATE
   * 2. Kiểm tra tính Idempotency: nếu status !== 'ACTIVE', trả về ngay mà không trừ âm
   * 3. Hoàn trả số lượng giữ chỗ trên từng lô (inventory_lots) qua FefoAllocationService.releaseLockedLots
   * 4. Hoàn trả số lượng giữ chỗ trên bảng inventory (Inventory Balances)
   * 5. Ghi nhật ký vào sổ cái InventoryTransaction (loại RESERVATION_RELEASE)
   * 6. Cập nhật trạng thái reservation sang targetStatus ('RELEASED' hoặc 'EXPIRED')
   * 7. Xuất bản Transactional Outbox Event: RESERVATION_RELEASED
   * 
   * @param tx Prisma.TransactionClient bắt buộc để bảo toàn tính ACID
   * @param reservationId Mã UUID của reservation cần giải phóng
   * @param options Tùy chọn trạng thái mới ('RELEASED' hoặc 'EXPIRED'), lý do và thời gian
   */
  async releaseReservation(
    tx: Prisma.TransactionClient,
    reservationId: string,
    options?: ReleaseReservationOptions,
  ): Promise<ReleaseReservationResult> {
    const now = options?.now || new Date();
    const targetStatus = options?.newStatus || 'RELEASED';
    const reason =
      options?.reason ||
      (targetStatus === 'EXPIRED'
        ? 'Tự động giải phóng do quá hạn thanh toán (Reservation Expired)'
        : 'Giải phóng giữ chỗ tồn kho (Reservation Released)');

    // 1. Khóa bi quan bản ghi reservation để ngăn chặn concurrent modification
    const [lockedRes] = await tx.$queryRaw<
      {
        id: string;
        status: string;
        location_id: string;
        order_id: string | null;
        fulfillment_order_id: string | null;
      }[]
    >(Prisma.sql`
      SELECT id, status, location_id, order_id, fulfillment_order_id
      FROM inventory_reservations
      WHERE id = ${reservationId}::uuid
      FOR UPDATE
    `);

    if (!lockedRes) {
      throw new NotFoundException(`Không tìm thấy InventoryReservation với ID ${reservationId}`);
    }

    // 2. Kiểm tra tính Idempotency: Nếu không còn ACTIVE thì không thực hiện lại
    if (lockedRes.status !== 'ACTIVE') {
      this.logger.warn(
        `Reservation ${reservationId} đang ở trạng thái '${lockedRes.status}', bỏ qua giải phóng giữ chỗ (Idempotent bypass).`,
      );
      return {
        reservationId,
        previousStatus: lockedRes.status,
        newStatus: lockedRes.status,
        releasedItems: [],
      };
    }

    // 3. Lấy danh sách items gắn với reservation
    const reservationItems = await tx.inventoryReservationItem.findMany({
      where: { reservationId },
    });

    // 4. Hoàn trả số lượng giữ chỗ trên từng lô hàng (inventory_lots)
    const lotAllocations = reservationItems.map((item) => ({
      lotId: item.lotId,
      quantity: item.quantity,
    }));
    await this.fefoAllocationService.releaseLockedLots(tx, lotAllocations);

    // 5. Hoàn trả số lượng giữ chỗ trên bảng inventory (Inventory Balances)
    const variantTotalQtyMap = new Map<string, number>();
    for (const item of reservationItems) {
      variantTotalQtyMap.set(
        item.productVariantId,
        (variantTotalQtyMap.get(item.productVariantId) || 0) + item.quantity,
      );
    }

    for (const [variantId, totalQty] of variantTotalQtyMap.entries()) {
      await tx.inventory.update({
        where: {
          storeId_productVariantId: {
            storeId: lockedRes.location_id,
            productVariantId: variantId,
          },
        },
        data: {
          reservedQuantity: { decrement: totalQty },
        },
      });

      // 6. Ghi sổ cái InventoryTransaction (loại RESERVATION_RELEASE)
      await tx.inventoryTransaction.create({
        data: {
          storeId: lockedRes.location_id,
          productVariantId: variantId,
          transactionType: 'RESERVATION_RELEASE',
          quantity: totalQty,
          referenceType: 'INVENTORY_RESERVATION',
          referenceId: reservationId,
          note: `${reason} (${targetStatus})`,
        },
      });
    }

    // 7. Cập nhật trạng thái reservation sang targetStatus ('RELEASED' hoặc 'EXPIRED')
    await tx.inventoryReservation.update({
      where: { id: reservationId },
      data: {
        status: targetStatus,
        updatedAt: now,
      },
    });

    // 8. Ghi nhận Transactional Outbox Event: RESERVATION_RELEASED
    await this.outboxWriter.record(tx, {
      id: randomUUID(),
      aggregateType: 'INVENTORY_RESERVATION',
      aggregateId: reservationId,
      eventType: 'RESERVATION_RELEASED',
      payload: {
        reservationId,
        orderId: lockedRes.order_id,
        fulfillmentOrderId: lockedRes.fulfillment_order_id,
        locationId: lockedRes.location_id,
        previousStatus: lockedRes.status,
        newStatus: targetStatus,
        reason,
        releasedItems: reservationItems.map((item) => ({
          productVariantId: item.productVariantId,
          lotId: item.lotId,
          quantity: item.quantity,
        })),
      },
      occurredAt: now,
    });

    this.logger.log(
      `Đã giải phóng InventoryReservation ${reservationId} thành công -> Trạng thái mới: ${targetStatus}.`,
    );

    return {
      reservationId,
      previousStatus: lockedRes.status,
      newStatus: targetStatus,
      releasedItems: reservationItems.map((item) => ({
        productVariantId: item.productVariantId,
        lotId: item.lotId,
        quantity: item.quantity,
      })),
    };
  }

  /**
   * Tiện ích giải phóng reservation tự động bọc trong Prisma transaction
   */
  async releaseReservationById(
    reservationId: string,
    options?: ReleaseReservationOptions,
  ): Promise<ReleaseReservationResult> {
    return this.prisma.$transaction(async (tx) => {
      return this.releaseReservation(tx, reservationId, options);
    });
  }
}
