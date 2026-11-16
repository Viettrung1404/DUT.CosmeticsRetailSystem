import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { IOutboxWriter, OUTBOX_WRITER } from '@modules/async-infrastructure';
import { OrderStateAggregator } from '@modules/oms/application/services/order-state-aggregator';
import {
  ConfirmHandoverDto,
  ConfirmHandoverResponseDto,
} from '../../presentation/dtos/handover.dto';

@Injectable()
export class HandoverService {
  private readonly logger = new Logger(HandoverService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(OUTBOX_WRITER)
    private readonly outboxWriter: IOutboxWriter,
    private readonly orderStateAggregator: OrderStateAggregator,
  ) {}

  /**
   * Xác nhận bàn giao kiện hàng cho tài xế/bưu tá 3PL:
   * 
   * Acceptance Criteria:
   * 1. Chưa có mã vận đơn (tracking_code) mà bấm bàn giao => Ném BadRequestException('SHIPMENT_NOT_READY: Kiện hàng chưa có mã vận đơn từ đối tác vận chuyển!')
   * 2. Bàn giao thành công => handed_over_at được ghi nhận, FO chuyển sang HANDED_OVER, trạng thái Order cha được cập nhật qua OrderStateAggregator.
   */
  async confirmHandover(
    fulfillmentOrderId: string,
    dto?: ConfirmHandoverDto,
    handoverById?: string,
  ): Promise<ConfirmHandoverResponseDto> {
    const fo = await this.prisma.fulfillmentOrder.findUnique({
      where: { id: fulfillmentOrderId },
      include: {
        order: true,
        shipments: true,
        packages: true,
      },
    });

    if (!fo) {
      throw new NotFoundException(
        `Không tìm thấy FulfillmentOrder với ID: ${fulfillmentOrderId}`,
      );
    }

    // Idempotency: Nếu đơn đã bàn giao cho tài xế
    if (fo.status === 'HANDED_OVER') {
      const linkedShipment = fo.shipments[0];
      this.logger.warn(
        `FulfillmentOrder ${fo.fulfillmentOrderNumber} đã ở trạng thái HANDED_OVER. Trả về thông tin hiện tại (Idempotent).`,
      );
      return {
        success: true,
        status: 'HANDED_OVER',
        handedOverAt: fo.handedOverAt || new Date(),
        fulfillmentOrderId: fo.id,
        shipmentId: linkedShipment?.id || '',
        trackingCode: linkedShipment?.trackingCode || '',
        orderStatus: fo.order.status,
      };
    }

    // Kiểm tra trạng thái FO phải là PACKED
    if (fo.status !== 'PACKED') {
      throw new BadRequestException(
        `FulfillmentOrder phải ở trạng thái PACKED để thực hiện bàn giao cho tài xế. Trạng thái hiện tại: ${fo.status}`,
      );
    }

    // Kiểm tra danh sách vận đơn liên kết
    if (!fo.shipments || fo.shipments.length === 0) {
      throw new BadRequestException(
        'SHIPMENT_NOT_READY: Kiện hàng chưa có vận đơn liên kết để bàn giao!',
      );
    }

    const activeShipments = fo.shipments.filter(
      (s) => s.status !== 'CANCELLED',
    );
    if (activeShipments.length === 0) {
      throw new BadRequestException(
        'SHIPMENT_NOT_READY: Không tìm thấy vận đơn hoạt động hợp lệ!',
      );
    }

    // AC1: Chưa có mã vận đơn (tracking_code) từ 3PL => Báo lỗi từ chối bàn giao
    const unreadyShipment = activeShipments.find(
      (s) => !s.trackingCode || s.trackingCode.trim() === '',
    );
    if (unreadyShipment) {
      throw new BadRequestException(
        'SHIPMENT_NOT_READY: Kiện hàng chưa có mã vận đơn từ đối tác vận chuyển!',
      );
    }

    const now = new Date();

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Cập nhật FulfillmentOrder sang HANDED_OVER
      const updatedFo = await tx.fulfillmentOrder.update({
        where: { id: fo.id },
        data: {
          status: 'HANDED_OVER',
          handedOverAt: now,
        },
      });

      // 2. Cập nhật các Shipments liên kết sang HANDED_OVER
      for (const shipment of activeShipments) {
        await tx.shipment.update({
          where: { id: shipment.id },
          data: {
            status: 'HANDED_OVER',
            handedOverAt: now,
          },
        });
      }

      // 3. Gọi OrderStateAggregator để cập nhật trạng thái đơn hàng cha
      const orderAggResult = await this.orderStateAggregator.computeOrderStatus(
        fo.orderId,
        tx,
        {
          changedBy: handoverById,
          note: `Bàn giao kiện hàng thuộc ${fo.fulfillmentOrderNumber} cho tài xế${dto?.driverName ? ` (${dto.driverName})` : ''}`,
        },
      );

      // 4. Ghi nhận Transactional Outbox Event FO_HANDED_OVER
      await this.outboxWriter.record(tx, {
        aggregateType: 'FULFILLMENT_ORDER',
        aggregateId: fo.id,
        eventType: 'FO_HANDED_OVER',
        payload: {
          fulfillmentOrderId: fo.id,
          orderId: fo.orderId,
          shipmentId: activeShipments[0].id,
          trackingCode: activeShipments[0].trackingCode,
          driverName: dto?.driverName,
          driverPhone: dto?.driverPhone,
          driverLicensePlate: dto?.driverLicensePlate,
          handedOverAt: now.toISOString(),
          orderStatus: orderAggResult.newStatus,
        },
      });

      return {
        updatedFo,
        orderStatus: orderAggResult.newStatus,
      };
    });

    this.logger.log(
      `FulfillmentOrder ${fo.fulfillmentOrderNumber} đã bàn giao thành công cho tài xế lúc ${now.toISOString()}. Trạng thái đơn hàng: ${result.orderStatus}`,
    );

    return {
      success: true,
      status: 'HANDED_OVER',
      handedOverAt: now,
      fulfillmentOrderId: fo.id,
      shipmentId: activeShipments[0].id,
      trackingCode: activeShipments[0].trackingCode || '',
      orderStatus: result.orderStatus,
    };
  }
}
