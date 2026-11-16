import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  Inject,
  Optional,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@infrastructure/database/prisma.service';
import {
  OUTBOX_WRITER,
  IOutboxWriter,
} from '@modules/async-infrastructure/outbox/outbox-writer.interface';
import {
  CodStatus,
  PackageValuation,
  AllocatedCod,
  allocateSplitCod,
  isValidCodTransition,
} from '../../domain/cod-status';

export interface CodOrderSummary {
  orderId: string;
  totalRemainingPayable: number;
  totalExpected: number;
  totalCollected: number;
  totalSettled: number;
  totalDiscrepancy: number;
  shipments: {
    shipmentId: string;
    shipmentCode: string;
    fulfillmentOrderId: string | null;
    trackingCode: string | null;
    carrierCode: string;
    codAmount: number;
    codStatus: string;
  }[];
}

@Injectable()
export class CodManagementService {
  private readonly logger = new Logger(CodManagementService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional()
    @Inject(OUTBOX_WRITER)
    private readonly outboxWriter?: IOutboxWriter,
  ) {}

  /**
   * Phân bổ COD theo tỷ lệ giá trị hàng hóa thuần túy trong bộ nhớ
   */
  allocateSplitCod(
    remainingPayable: number,
    packages: PackageValuation[],
  ): AllocatedCod[] {
    return allocateSplitCod(remainingPayable, packages);
  }

  /**
   * Tính toán số tiền COD cần thu cho một FulfillmentOrder khi đóng gói / tạo vận đơn
   */
  async calculateFulfillmentOrderCod(
    fulfillmentOrderId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    const client = tx || this.prisma;

    const currentFo = await client.fulfillmentOrder.findUnique({
      where: { id: fulfillmentOrderId },
      include: {
        order: {
          include: {
            payments: true,
            fulfillmentOrders: {
              include: {
                items: {
                  include: {
                    orderItem: true,
                  },
                },
              },
            },
          },
        },
        items: {
          include: {
            orderItem: true,
          },
        },
      },
    });

    if (!currentFo) {
      throw new NotFoundException(
        `Không tìm thấy FulfillmentOrder với ID: ${fulfillmentOrderId}`,
      );
    }

    const order = currentFo.order;
    const codPayment = order.payments.find(
      (p) => p.paymentMethod === 'COD' && p.status === 'PENDING',
    );

    // Không có thanh toán COD đang chờ thu -> 0
    if (!codPayment || Number(codPayment.amount) <= 0) {
      return 0;
    }

    const remainingPayable = Number(codPayment.amount);
    const allFos = order.fulfillmentOrders;

    // Đơn hàng chỉ có 1 FO duy nhất -> gán toàn bộ số tiền còn nợ
    if (allFos.length <= 1) {
      return remainingPayable;
    }

    // Tính toán giá trị hàng hóa của từng FO
    const valuations: PackageValuation[] = allFos.map((fo) => {
      const foValue = fo.items.reduce((sum, item) => {
        const unitPrice =
          item.orderItem?.unitPrice != null
            ? Number(item.orderItem.unitPrice)
            : item.orderItem?.totalPrice != null && item.orderItem.quantity > 0
              ? Number(item.orderItem.totalPrice) / item.orderItem.quantity
              : 0;
        return sum + item.quantityRequested * unitPrice;
      }, 0);

      return {
        id: fo.id,
        value: foValue,
      };
    });

    const allocations = allocateSplitCod(remainingPayable, valuations);
    const matched = allocations.find((a) => a.id === fulfillmentOrderId);

    return matched ? matched.codAmount : 0;
  }

  /**
   * Phân bổ COD cho tất cả FulfillmentOrders của một Order
   */
  async allocateCodForOrder(
    orderId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<Map<string, number>> {
    const client = tx || this.prisma;

    const order = await client.order.findUnique({
      where: { id: orderId },
      include: {
        payments: true,
        fulfillmentOrders: {
          include: {
            items: {
              include: {
                orderItem: true,
              },
            },
          },
        },
      },
    });

    const result = new Map<string, number>();
    if (!order) {
      throw new NotFoundException(`Không tìm thấy Order với ID: ${orderId}`);
    }

    const codPayment = order.payments.find(
      (p) => p.paymentMethod === 'COD' && p.status === 'PENDING',
    );

    if (!codPayment || Number(codPayment.amount) <= 0) {
      order.fulfillmentOrders.forEach((fo) => result.set(fo.id, 0));
      return result;
    }

    const remainingPayable = Number(codPayment.amount);
    const allFos = order.fulfillmentOrders;

    if (allFos.length <= 1) {
      if (allFos.length === 1) {
        result.set(allFos[0].id, remainingPayable);
      }
      return result;
    }

    const valuations: PackageValuation[] = allFos.map((fo) => {
      const foValue = fo.items.reduce((sum, item) => {
        const unitPrice =
          item.orderItem?.unitPrice != null
            ? Number(item.orderItem.unitPrice)
            : item.orderItem?.totalPrice != null && item.orderItem.quantity > 0
              ? Number(item.orderItem.totalPrice) / item.orderItem.quantity
              : 0;
        return sum + item.quantityRequested * unitPrice;
      }, 0);

      return {
        id: fo.id,
        value: foValue,
      };
    });

    const allocations = allocateSplitCod(remainingPayable, valuations);
    allocations.forEach((a) => result.set(a.id, a.codAmount));

    return result;
  }

  /**
   * Chuyển đổi trạng thái vòng đời thu hộ COD
   */
  async transitionCodStatus(
    shipmentId: string,
    targetStatus: CodStatus,
    metadata?: Record<string, any>,
    tx?: Prisma.TransactionClient,
  ) {
    const runInTx = async (db: Prisma.TransactionClient) => {
      const shipment = await db.shipment.findUnique({
        where: { id: shipmentId },
      });

      if (!shipment) {
        throw new NotFoundException(
          `Không tìm thấy Shipment với ID: ${shipmentId}`,
        );
      }

      const check = isValidCodTransition(shipment.codStatus, targetStatus);
      if (!check.isValid) {
        throw new BadRequestException(check.reason);
      }

      const updated = await db.shipment.update({
        where: { id: shipmentId },
        data: {
          codStatus: targetStatus,
        },
      });

      // Phát Transactional Outbox Event khi xác nhận đã thu tiền thành công
      if (
        targetStatus === 'COD_COLLECTED' &&
        this.outboxWriter &&
        Number(shipment.codAmount) > 0
      ) {
        await this.outboxWriter.record(db, {
          aggregateType: 'SHIPMENT',
          aggregateId: shipment.id,
          eventType: 'COD_COLLECTED_CONFIRMED',
          occurredAt: new Date(),
          payload: {
            shipmentId: shipment.id,
            orderId: shipment.orderId,
            fulfillmentOrderId: shipment.fulfillmentOrderId,
            trackingCode: shipment.trackingCode,
            carrierCode: shipment.carrierCode,
            codAmount: Number(shipment.codAmount),
            collectedAt: new Date(),
            metadata: metadata || {},
          },
        });
      }

      return updated;
    };

    if (tx) {
      return runInTx(tx);
    }
    return this.prisma.$transaction(runInTx);
  }

  /**
   * Xác nhận Shipper đã thu tiền COD mặt thành công
   */
  async confirmCodCollected(
    shipmentId: string,
    tx?: Prisma.TransactionClient,
  ) {
    return this.transitionCodStatus(shipmentId, 'COD_COLLECTED', undefined, tx);
  }

  /**
   * Báo cáo tổng quan tình trạng COD của đơn hàng
   */
  async getCodSummary(
    orderId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<CodOrderSummary> {
    const client = tx || this.prisma;

    const order = await client.order.findUnique({
      where: { id: orderId },
      include: {
        payments: true,
        shipments: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Không tìm thấy Order với ID: ${orderId}`);
    }

    const codPayment = order.payments.find(
      (p) => p.paymentMethod === 'COD' && p.status === 'PENDING',
    );
    const totalRemainingPayable = codPayment ? Number(codPayment.amount) : 0;

    let totalExpected = 0;
    let totalCollected = 0;
    let totalSettled = 0;
    let totalDiscrepancy = 0;

    const shipmentsDetail = order.shipments.map((s) => {
      const amount = Number(s.codAmount);
      const status = s.codStatus || 'COD_EXPECTED';

      if (status === 'COD_EXPECTED') totalExpected += amount;
      if (status === 'COD_COLLECTED' || status === 'SETTLEMENT_PENDING')
        totalCollected += amount;
      if (status === 'SETTLED') totalSettled += amount;
      if (status === 'SETTLEMENT_DISCREPANCY') totalDiscrepancy += amount;

      return {
        shipmentId: s.id,
        shipmentCode: s.shipmentCode,
        fulfillmentOrderId: s.fulfillmentOrderId,
        trackingCode: s.trackingCode,
        carrierCode: s.carrierCode,
        codAmount: amount,
        codStatus: status,
      };
    });

    return {
      orderId,
      totalRemainingPayable,
      totalExpected,
      totalCollected,
      totalSettled,
      totalDiscrepancy,
      shipments: shipmentsDetail,
    };
  }
}
