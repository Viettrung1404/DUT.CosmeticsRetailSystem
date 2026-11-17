import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { OutboxWriterService } from '../../../async-infrastructure/outbox/outbox-writer.service';
import { DispatchReturnPickupDto } from '../../presentation/dtos/dispatch-pickup.dto';
import {
  ReturnChannel,
  ReturnOrderStatus,
} from '../../domain/entities/return-policy.entity';

@Injectable()
export class ReverseShippingService {
  private readonly logger = new Logger(ReverseShippingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly outboxWriter: OutboxWriterService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Phát lệnh điều phối bưu tá GHN đến thu gom hàng đổi trả tận nhà khách hàng (EP14-T02)
   */
  async dispatchReturnPickup(
    returnOrderId: string,
    operatorUserId: string,
    dto: DispatchReturnPickupDto = {},
  ) {
    const returnOrder = await this.prisma.returnOrder.findUnique({
      where: { id: returnOrderId },
      include: {
        items: true,
        order: { select: { orderNumber: true, storeId: true } },
        shipments: {
          where: { shipmentType: 'RETURN_PICKUP' },
        },
      },
    });

    if (!returnOrder) {
      throw new NotFoundException(
        `Không tìm thấy hồ sơ đổi trả với ID: ${returnOrderId}`,
      );
    }

    if (returnOrder.returnChannel !== ReturnChannel.CARRIER_PICKUP) {
      throw new BadRequestException(
        'Hồ sơ đổi trả này không đăng ký hình thức thu gom tận nhà qua bưu tá',
      );
    }

    if (!returnOrder.pickupAddress) {
      throw new BadRequestException(
        'Hồ sơ đổi trả chưa có địa chỉ chi tiết để bưu tá đến thu hồi',
      );
    }

    // 1. Kiểm tra trạng thái hồ sơ RMA
    const validStatuses = [
      ReturnOrderStatus.SUBMITTED,
      ReturnOrderStatus.APPROVED,
      'AWAITING_PICKUP',
    ];

    if (!validStatuses.includes(returnOrder.status as any)) {
      throw new ConflictException(
        `Không thể phát lệnh bưu tá cho hồ sơ đang ở trạng thái "${returnOrder.status}"`,
      );
    }

    // 2. Kiểm tra nếu đã có vận đơn thu hồi đang xử lý
    const existingActiveShipment = returnOrder.shipments.find(
      (s) => !['CANCELLED', 'FAILED'].includes(s.status),
    );

    if (existingActiveShipment) {
      throw new ConflictException(
        `Hồ sơ đổi trả đã được gán vận đơn thu gom ${existingActiveShipment.trackingCode} (trạng thái: ${existingActiveShipment.status})`,
      );
    }

    // 3. Xác định kho/showroom đích tiếp nhận hàng hoàn
    let destinationStoreId = dto.destinationWarehouseId;
    if (!destinationStoreId) {
      const warehouse = await this.prisma.store.findFirst({
        where: { type: 'WAREHOUSE', isActive: true },
      });
      destinationStoreId = warehouse?.id || returnOrder.storeId;
    }

    // 4. Sinh mã vận đơn và tracking code chuẩn GHN Reverse (Mã LADXXXXX)
    const shipmentCode = `SHP-REV-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
    const randomLADNumber = Math.floor(100000 + Math.random() * 900000);
    const trackingCode = `LAD${randomLADNumber}`;
    const shippingLabelUrl = `https://online-gateway.ghn.vn/a5/print/${trackingCode}`;

    // 5. Giao dịch ACID: Tạo Shipment RETURN_PICKUP, cập nhật ReturnOrder sang APPROVED/AWAITING_PICKUP, ghi Outbox Event
    const result = await this.prisma.$transaction(async (tx) => {
      const shipment = await tx.shipment.create({
        data: {
          orderId: returnOrder.orderId,
          returnOrderId: returnOrder.id,
          shipmentCode,
          shipmentType: 'RETURN_PICKUP',
          carrierCode: 'GHN',
          trackingCode,
          shippingLabelUrl,
          status: 'READY_TO_PICK',
        },
      });

      const updatedReturnOrder = await tx.returnOrder.update({
        where: { id: returnOrder.id },
        data: {
          status: ReturnOrderStatus.APPROVED,
          handledBy: operatorUserId,
        },
        include: {
          items: true,
          shipments: true,
        },
      });

      // Ghi Outbox Event: RETURN_PICKUP_DISPATCHED
      await this.outboxWriter.record(tx, {
        aggregateType: 'RETURN_ORDER',
        aggregateId: returnOrder.id,
        eventType: 'RETURN_PICKUP_DISPATCHED',
        payload: {
          returnOrderId: returnOrder.id,
          returnCode: returnOrder.returnCode,
          shipmentId: shipment.id,
          shipmentCode: shipment.shipmentCode,
          trackingCode: shipment.trackingCode,
          carrierCode: 'GHN',
          pickupAddress: returnOrder.pickupAddress,
          destinationLocationId: destinationStoreId,
          dispatchedAt: shipment.createdAt.toISOString(),
          labelUrl: shippingLabelUrl,
        },
      });

      return { shipment, returnOrder: updatedReturnOrder };
    });

    return result;
  }

  /**
   * Cập nhật trạng thái khi bưu tá GHN đã quét bưu kiện và kiện hàng đang luân chuyển (Webhook callback)
   */
  async handleCarrierPickedUp(trackingCode: string) {
    const shipment = await this.prisma.shipment.findUnique({
      where: { trackingCode },
      include: { returnOrder: true },
    });

    if (!shipment) {
      throw new NotFoundException(
        `Không tìm thấy vận đơn thu hồi với tracking code: ${trackingCode}`,
      );
    }

    if (!shipment.returnOrderId) {
      return shipment;
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedShipment = await tx.shipment.update({
        where: { id: shipment.id },
        data: { status: 'IN_TRANSIT' },
      });

      const updatedReturnOrder = await tx.returnOrder.update({
        where: { id: shipment.returnOrderId! },
        data: { status: 'IN_TRANSIT' },
      });

      await this.outboxWriter.record(tx, {
        aggregateType: 'RETURN_ORDER',
        aggregateId: shipment.returnOrderId!,
        eventType: 'RMA_IN_TRANSIT',
        payload: {
          returnOrderId: shipment.returnOrderId,
          shipmentId: shipment.id,
          trackingCode: shipment.trackingCode,
          carrierCode: shipment.carrierCode,
          status: 'IN_TRANSIT',
          timestamp: new Date().toISOString(),
        },
      });

      return { shipment: updatedShipment, returnOrder: updatedReturnOrder };
    });

    return result;
  }
}
