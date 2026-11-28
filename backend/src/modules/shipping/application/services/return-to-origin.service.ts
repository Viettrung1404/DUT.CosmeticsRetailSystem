import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { Prisma } from '@prisma/client';
import {
  ReceiveRtoShipmentDto,
  ReceiveRtoResponseDto,
  RtoPackageCondition,
} from '../../presentation/dtos/return-to-origin.dto';
import { IOutboxWriter, OUTBOX_WRITER } from '@modules/async-infrastructure';
import { OrderStateAggregator } from '@modules/oms/application/services/order-state-aggregator';

@Injectable()
export class ReturnToOriginService {
  private readonly logger = new Logger(ReturnToOriginService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional()
    @Inject(OUTBOX_WRITER)
    private readonly outboxWriter?: IOutboxWriter,
    @Optional()
    private readonly orderStateAggregator?: OrderStateAggregator,
  ) {}

  /**
   * Quy trình tiếp nhận bưu phẩm chuyển hoàn (Return To Origin - RTO) tại kho gửi ban đầu
   * 
   * Acceptance Criteria:
   * 1. Hàng hoàn RTO nguyên seal (INTACT) được khôi phục tồn kho chính xác tới từng lô (InventoryLot & Store balance).
   * 2. Hàng hoàn RTO rách nát bể vỡ (DAMAGED) đưa vào diện cách ly (QUARANTINED) để chờ lập biên bản bồi thường với 3PL.
   * 3. Trạng thái Shipment chuyển sang RETURNED, phát sự kiện Outbox SHIPMENT_RETURNED_TO_ORIGIN và đồng bộ OrderStateAggregator.
   */
  async receiveRtoShipment(
    shipmentIdOrTracking: string,
    dto: ReceiveRtoShipmentDto,
    tx?: Prisma.TransactionClient,
  ): Promise<ReceiveRtoResponseDto> {
    const executeInTx = async (client: Prisma.TransactionClient): Promise<ReceiveRtoResponseDto> => {
      // 1. Tìm kiếm Shipment kèm FulfillmentOrder, Reservation, và ReservationItems
      const shipment = await client.shipment.findFirst({
        where: {
          OR: [
            { id: shipmentIdOrTracking },
            { trackingCode: shipmentIdOrTracking },
            { shipmentCode: shipmentIdOrTracking },
          ],
        },
        include: {
          fulfillmentOrder: {
            include: {
              reservation: {
                include: {
                  items: true,
                },
              },
            },
          },
          order: true,
        },
      });

      if (!shipment) {
        throw new NotFoundException(
          `Không tìm thấy vận đơn để tiếp nhận chuyển hoàn: ${shipmentIdOrTracking}`,
        );
      }

      // Kiểm tra trạng thái hợp lệ: Phải đang trong quá trình chuyển hoàn hoặc thất bại
      const validReceiveStatuses = [
        'RETURNING',
        'RETURNED',
        'DELIVERY_FAILED',
        'OUT_FOR_DELIVERY',
        'IN_TRANSIT',
        'EXCEPTION',
      ];
      if (!validReceiveStatuses.includes(shipment.status)) {
        throw new BadRequestException(
          `Vận đơn ở trạng thái ${shipment.status} không hợp lệ để tiếp nhận chuyển hoàn RTO. Yêu cầu trạng thái: ${validReceiveStatuses.join(', ')}`,
        );
      }

      const receivedAt = new Date();
      const locationId = (shipment as any).fulfillmentOrder?.sourceLocationId;
      const reservationItems =
        (shipment as any).fulfillmentOrder?.reservation?.items || [];


      const restockedLots: Array<{ lotId: string; productVariantId: string; quantity: number }> = [];
      const quarantinedItems: Array<{ productVariantId: string; quantity: number }> = [];

      // 2. Xử lý tồn kho theo tình trạng bao bì (Condition Check)
      if (dto.packageCondition === RtoPackageCondition.INTACT) {
        // TÌNH TRẠNG 1: NGUYÊN SEAL -> Nhập lại đúng Lô ban đầu và tăng Sellable Stock
        this.logger.log(
          `Bao bì bưu phẩm ${shipment.trackingCode} nguyên seal. Thực hiện hoàn nhập tồn kho về đúng lô và số dư...`,
        );

        for (const item of reservationItems) {
          // A. Hoàn nhập số lượng vào InventoryLot ban đầu
          if (item.lotId) {
            await client.inventoryLot.update({
              where: { id: item.lotId },
              data: {
                quantityOnHand: { increment: item.quantity },
              },
            });
          }

          // B. Hoàn nhập số lượng vật lý vào Inventory của chi nhánh xuất hàng
          if (locationId) {
            await client.inventory.update({
              where: {
                storeId_productVariantId: {
                  storeId: locationId,
                  productVariantId: item.productVariantId,
                },
              },
              data: {
                quantity: { increment: item.quantity },
              },
            });
          }

          restockedLots.push({
            lotId: item.lotId,
            productVariantId: item.productVariantId,
            quantity: item.quantity,
          });
        }
      } else {
        // TÌNH TRẠNG 2: RÁCH NÁT / BỂ VỠ -> Chuyển vào QUARANTINED để lập biên bản bồi thường
        this.logger.warn(
          `Bao bì bưu phẩm ${shipment.trackingCode} bị hư hỏng / rách nát (${dto.packageCondition}). Chuyển vào trạng thái QUARANTINED...`,
        );

        for (const item of reservationItems) {
          if (locationId) {
            // Tăng quantity (đã nhận lại vật lý) đồng thời tăng quarantinedQuantity -> availableQuantity không đổi (bằng 0)
            await client.inventory.update({
              where: {
                storeId_productVariantId: {
                  storeId: locationId,
                  productVariantId: item.productVariantId,
                },
              },
              data: {
                quantity: { increment: item.quantity },
                quarantinedQuantity: { increment: item.quantity },
              },
            });
          }

          quarantinedItems.push({
            productVariantId: item.productVariantId,
            quantity: item.quantity,
          });
        }
      }

      // 3. Cập nhật Shipment sang RETURNED và lưu metadata RTO
      const existingMeta = (shipment.carrierMetadata as Record<string, any>) || {};
      await client.shipment.update({
        where: { id: shipment.id },
        data: {
          status: 'RETURNED',
          carrierMetadata: {
            ...existingMeta,
            rto: {
              receivedAt: receivedAt.toISOString(),
              packageCondition: dto.packageCondition,
              notes: dto.notes || null,
              receivedById: dto.receivedById || null,
              restockedCount: restockedLots.length,
              quarantinedCount: quarantinedItems.length,
            },
          },
        },
      });

      // 4. Cập nhật FulfillmentOrder nếu có
      if (shipment.fulfillmentOrderId) {
        await client.fulfillmentOrder.update({
          where: { id: shipment.fulfillmentOrderId },
          data: {
            status: 'RETURNED',
          },
        });
      }

      // 5. Phát sự kiện Outbox miền SHIPMENT_RETURNED_TO_ORIGIN
      if (this.outboxWriter) {
        await this.outboxWriter.record(client, {
          aggregateType: 'SHIPMENT',
          aggregateId: shipment.id,
          eventType: 'SHIPMENT_RETURNED_TO_ORIGIN',
          occurredAt: receivedAt,
          payload: {
            shipmentId: shipment.id,
            orderId: shipment.orderId,
            fulfillmentOrderId: shipment.fulfillmentOrderId,
            locationId,
            packageCondition: dto.packageCondition,
            restockedLots,
            quarantinedItems,
            receivedAt,
          },
        });
      }

      // 6. Tính toán lại trạng thái Order cha
      if (this.orderStateAggregator && shipment.orderId) {
        await this.orderStateAggregator.computeOrderStatus(shipment.orderId, client);
      }

      this.logger.log(
        `Tiếp nhận thành công kiện hoàn RTO: shipmentId=${shipment.id}, condition=${dto.packageCondition}, restocked=${restockedLots.length}, quarantined=${quarantinedItems.length}`,
      );

      return {
        success: true,
        status: 'RETURNED',
        packageCondition: dto.packageCondition,
        restockedLots,
        quarantinedItems,
        receivedAt,
      };
    };

    if (tx) {
      return executeInTx(tx);
    }
    return this.prisma.$transaction(executeInTx);
  }
}
