import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { Prisma } from '@prisma/client';
import { IOutboxWriter, OUTBOX_WRITER } from '@modules/async-infrastructure';

export interface ComputeOrderStatusOptions {
  changedBy?: string;
  note?: string;
  forceStatus?: string;
}

export interface OrderStateAggregationResult {
  orderId: string;
  previousStatus: string;
  newStatus: string;
  hasChanged: boolean;
  notes?: string;
}

@Injectable()
export class OrderStateAggregator {
  private readonly logger = new Logger(OrderStateAggregator.name);
  public static readonly AUTO_COMPLETE_HOURS = 24; // DEC-03: Sau 24h ở DELIVERED tự động chuyển COMPLETED

  constructor(
    private readonly prisma: PrismaService,
    @Optional()
    @Inject(OUTBOX_WRITER)
    private readonly outboxWriter?: IOutboxWriter,
  ) {}

  /**
   * Tính toán và đồng bộ trạng thái tổng thể của Order dựa trên các FulfillmentOrders và Shipments con.
   * Chạy an toàn bên trong PostgreSQL Transaction Client (`tx`).
   */
  async computeOrderStatus(
    orderId: string,
    tx?: Prisma.TransactionClient,
    options?: ComputeOrderStatusOptions,
  ): Promise<OrderStateAggregationResult> {
    const client = tx || this.prisma;

    // 1. Tải thông tin Order kèm toàn bộ FulfillmentOrders và Shipments con
    const order = await client.order.findUnique({
      where: { id: orderId },
      include: {
        fulfillmentOrders: {
          select: {
            id: true,
            status: true,
            fulfillmentOrderNumber: true,
            sourceLocationId: true,
          },
        },
        shipments: {
          select: {
            id: true,
            status: true,
            trackingCode: true,
            deliveredAt: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Không tìm thấy đơn hàng với ID ${orderId}`);
    }

    const previousStatus = order.status;

    // Nếu chỉ định forceStatus thì áp dụng trực tiếp
    if (options?.forceStatus) {
      return this.applyStatusChange(
        client,
        orderId,
        previousStatus,
        options.forceStatus,
        options.note || 'Trạng thái được cập nhật trực tiếp theo yêu cầu',
        options.changedBy,
      );
    }

    // Nếu đơn đã ở trạng thái kết thúc (Terminal states), giữ nguyên
    const terminalStates = ['CANCELLED', 'COMPLETED', 'REFUNDED'];
    if (terminalStates.includes(previousStatus)) {
      return {
        orderId,
        previousStatus,
        newStatus: previousStatus,
        hasChanged: false,
        notes: `Đơn hàng đã ở trạng thái kết thúc ${previousStatus}`,
      };
    }

    // 2. TÍNH TOÁN TRẠNG THÁI MỚI DỰA TRÊN MA TRẬN CHUYỂN ĐỔI (STATE MACHINE)
    const fos = order.fulfillmentOrders || [];
    const shipments = order.shipments || [];

    const computedStatus = this.resolveAggregatedStatus(
      previousStatus,
      fos,
      shipments,
    );

    if (computedStatus === previousStatus) {
      return {
        orderId,
        previousStatus,
        newStatus: previousStatus,
        hasChanged: false,
      };
    }

    return this.applyStatusChange(
      client,
      orderId,
      previousStatus,
      computedStatus,
      options?.note || `Trạng thái tự động cập nhật từ các kiện hàng (${previousStatus} -> ${computedStatus})`,
      options?.changedBy,
    );
  }

  /**
   * Thuật toán phân định trạng thái tổng thể dựa trên danh sách FO và Shipment
   */
  private resolveAggregatedStatus(
    currentOrderStatus: string,
    fos: Array<{ status: string }>,
    shipments: Array<{ status: string }>,
  ): string {
    // 1. Kiểm tra trường hợp HỦY ĐƠN: 100% FOs bị hủy
    if (fos.length > 0 && fos.every((f) => f.status === 'CANCELLED')) {
      return 'CANCELLED';
    }

    // 2. GIAI ĐOẠN GIAO HÀNG (DELIVERY) - Xem xét Shipments nếu đã được tạo
    const activeShipments = shipments.filter((s) => s.status !== 'CANCELLED');

    if (activeShipments.length > 0) {
      const deliveredCount = activeShipments.filter(
        (s) => s.status === 'DELIVERED',
      ).length;
      const returnedCount = activeShipments.filter(
        (s) => s.status === 'RETURNED',
      ).length;

      // TIÊU CHÍ NGHIỆM THU AC2: 100% Shipment là DELIVERED => Order là DELIVERED
      if (deliveredCount === activeShipments.length) {
        return 'DELIVERED';
      }

      // TIÊU CHÍ NGHIỆM THU AC1: Đơn 2 kiện, Kiện 1 giao thành công => PARTIALLY_DELIVERED
      if (deliveredCount > 0 && deliveredCount < activeShipments.length) {
        return 'PARTIALLY_DELIVERED';
      }

      // Xử lý hàng chuyển hoàn (RTO)
      if (returnedCount > 0) {
        if (returnedCount === activeShipments.length) {
          return 'RETURNED';
        }
        // Một kiện bị RTO nhưng kiện khác vẫn đang giao hoặc đã giao => PARTIALLY_RETURNED
        return deliveredCount > 0 ? 'PARTIALLY_DELIVERED' : 'PARTIALLY_RETURNED';
      }

      // Nếu có kiện đang trong quá trình vận chuyển (IN_TRANSIT, OUT_FOR_DELIVERY, PICKED_UP)
      const inTransitCount = activeShipments.filter((s) =>
        ['PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'].includes(s.status),
      ).length;

      if (inTransitCount === activeShipments.length) {
        return 'SHIPPED';
      } else if (inTransitCount > 0) {
        return 'PARTIALLY_SHIPPED';
      }
    }

    // 3. GIAI ĐOẠN HOÀN TẤT TẠI KHO / BÀN GIAO (WMS HANDOVER)
    const activeFos = fos.filter((f) => f.status !== 'CANCELLED');

    if (activeFos.length > 0) {
      const handedOverCount = activeFos.filter((f) =>
        ['HANDED_OVER', 'COMPLETED'].includes(f.status),
      ).length;

      // 100% FO là HANDED_OVER => Order là SHIPPED
      if (handedOverCount === activeFos.length) {
        return 'SHIPPED';
      }

      // 1 FO là HANDED_OVER, 1 FO đang PACKING / PICKED => PARTIALLY_SHIPPED
      if (handedOverCount > 0 && handedOverCount < activeFos.length) {
        return 'PARTIALLY_SHIPPED';
      }

      // Nếu đang nhặt hàng hoặc đóng gói
      const inProgressCount = activeFos.filter((f) =>
        ['PICKING', 'PICKED', 'PACKING', 'PACKED'].includes(f.status),
      ).length;

      if (inProgressCount > 0 && ['CONFIRMED', 'PENDING', 'PENDING_PAYMENT'].includes(currentOrderStatus)) {
        return 'PROCESSING';
      }
    }

    return currentOrderStatus;
  }

  /**
   * Áp dụng thay đổi trạng thái, ghi nhận lịch sử và xuất bản Transactional Outbox Event
   */
  private async applyStatusChange(
    client: Prisma.TransactionClient,
    orderId: string,
    previousStatus: string,
    newStatus: string,
    note: string,
    changedBy?: string,
  ): Promise<OrderStateAggregationResult> {
    // 1. Cập nhật trạng thái trên bảng orders
    await client.order.update({
      where: { id: orderId },
      data: { status: newStatus },
    });

    // 2. Ghi nhận lịch sử chuyển trạng thái (order_status_history)
    await client.orderStatusHistory.create({
      data: {
        orderId,
        status: newStatus,
        note,
        changedBy: changedBy || null,
      },
    });

    // 2.1 Cập nhật thanh toán COD thành COMPLETED nếu đơn đã giao thành công / hoàn tất
    if (['DELIVERED', 'COMPLETED'].includes(newStatus)) {
      await client.payment.updateMany({
        where: { orderId, paymentMethod: 'COD', status: 'PENDING' },
        data: { status: 'COMPLETED', paidAt: new Date() },
      });
    }

    // 3. Xuất bản Transactional Outbox Event (ORDER_STATUS_CHANGED)
    if (this.outboxWriter) {
      await this.outboxWriter.record(client, {
        aggregateType: 'ORDER',
        aggregateId: orderId,
        eventType: 'ORDER_STATUS_CHANGED',
        payload: {
          orderId,
          previousStatus,
          newStatus,
          note,
          changedAt: new Date(),
        },
      });
    }

    this.logger.log(
      `Order ${orderId} transitioned: ${previousStatus} -> ${newStatus} (${note})`,
    );

    return {
      orderId,
      previousStatus,
      newStatus,
      hasChanged: true,
      notes: note,
    };
  }

  /**
   * Tiến trình quét nền tự động hoàn tất các đơn hàng đã giao thành công quá 24h theo DEC-03
   */
  async processAutoCompletion(
    now: Date = new Date(),
    limit = 100,
  ): Promise<number> {
    const thresholdDate = new Date(
      now.getTime() - OrderStateAggregator.AUTO_COMPLETE_HOURS * 60 * 60 * 1000,
    );

    // Tìm các đơn hàng DELIVERED có updatedAt <= now - 24h
    const eligibleOrders = await this.prisma.order.findMany({
      where: {
        status: 'DELIVERED',
        updatedAt: { lte: thresholdDate },
      },
      select: { id: true },
      take: limit,
    });

    let completedCount = 0;

    for (const order of eligibleOrders) {
      await this.prisma.$transaction(async (tx) => {
        await this.computeOrderStatus(order.id, tx, {
          forceStatus: 'COMPLETED',
          note: 'Đơn hàng tự động hoàn tất sau 24h giao thành công không có khiếu nại (DEC-03)',
        });
        completedCount++;
      });
    }

    return completedCount;
  }
}
