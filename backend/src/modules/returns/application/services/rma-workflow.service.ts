import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import {
  ReturnOrderStatus,
  ReturnChannel,
  ReturnReasonCode,
} from '../../domain/entities/return-policy.entity';
import { OutboxWriterService } from '../../../async-infrastructure/outbox/outbox-writer.service';
import { RefundCalculatorService } from './refund-calculator.service';

export interface StaleRmaResult {
  expiredCount: number;
  expiredReturnOrders: Array<{
    id: string;
    returnCode: string;
    customerId: string;
    channel: string;
    approvedAt: Date;
    cancelledAt: Date;
  }>;
}

export interface QcSlaBreachResult {
  breachCount: number;
  breachedReturnOrders: Array<{
    id: string;
    returnCode: string;
    storeId: string;
    receivedAt: Date;
    hoursOverdue: number;
  }>;
}

export interface LostPackageResolutionResult {
  returnOrderId: string;
  claimId: string;
  claimCode: string;
  refundId: string;
  refundAmount: number;
  status: string;
}

@Injectable()
export class RmaWorkflowService {
  private readonly logger = new Logger(RmaWorkflowService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly refundCalculatorService: RefundCalculatorService,
    private readonly outboxWriter: OutboxWriterService,
  ) {}

  /**
   * 1. Kịch bản Timer Timeout 7 Ngày (TC-RMA-18):
   * Quét các yêu cầu RMA đã duyệt (APPROVED) quá thời hạn quy định (mặc định 7 ngày)
   * mà khách hàng không mang ra Showroom hoặc shipper không lấy được hàng.
   * Tự động hủy yêu cầu RMA với trạng thái CANCELLED.
   */
  async expireStaleApprovedRmas(
    thresholdDays = 7,
    referenceDate = new Date(),
  ): Promise<StaleRmaResult> {
    const cutoffDate = new Date(referenceDate.getTime() - thresholdDays * 24 * 60 * 60 * 1000);

    const candidates = await this.prisma.returnOrder.findMany({
      where: {
        status: ReturnOrderStatus.APPROVED,
        updatedAt: { lte: cutoffDate },
      },
      include: {
        receipts: true,
        shipments: true,
      },
    });

    const defaultUser = await this.prisma.user.findFirst({ select: { id: true } });
    const fallbackUserId = defaultUser?.id;

    const toExpire: typeof candidates = [];

    for (const rma of candidates) {
      if (rma.returnChannel === ReturnChannel.STORE_DROPOFF) {
        if (!rma.receipts || rma.receipts.length === 0) {
          toExpire.push(rma);
        }
      } else {
        const activeShipment = rma.shipments?.find(
          (s) => s.shipmentType === 'RETURN_PICKUP',
        );
        if (
          !activeShipment ||
          ['PENDING', 'CREATED', 'CREATION_UNKNOWN'].includes(activeShipment.status)
        ) {
          toExpire.push(rma);
        }
      }
    }

    const expiredReturnOrders: StaleRmaResult['expiredReturnOrders'] = [];

    for (const rma of toExpire) {
      const now = new Date();
      await this.prisma.$transaction(async (tx) => {
        // Cập nhật trạng thái CANCELLED
        await tx.returnOrder.update({
          where: { id: rma.id },
          data: {
            status: ReturnOrderStatus.CANCELLED,
            adminNote: `[WORKFLOW_TIMEOUT] Quá hạn ${thresholdDays} ngày khách hàng không gửi sản phẩm đổi trả (TC-RMA-18).`,
            version: { increment: 1 },
          },
        });

        // Ghi nhật ký trạng thái
        if (fallbackUserId || rma.handledBy) {
          await tx.returnStatusHistory.create({
            data: {
              returnOrderId: rma.id,
              status: ReturnOrderStatus.CANCELLED,
              changedBy: rma.handledBy || fallbackUserId!,
              note: `Hệ thống tự động hủy hồ sơ do quá hạn ${thresholdDays} ngày không bàn giao bưu kiện.`,
            },
          });
        }

        // Ghi nhận sự kiện Outbox
        await tx.outboxEvent.create({
          data: {
            aggregateType: 'RETURN_ORDER',
            aggregateId: rma.id,
            eventType: 'RMA_EXPIRED_CANCELLED',
            payload: {
              returnOrderId: rma.id,
              returnCode: rma.returnCode,
              customerId: rma.customerId,
              channel: rma.returnChannel,
              expiredAt: now,
            },
          },
        });
      });

      expiredReturnOrders.push({
        id: rma.id,
        returnCode: rma.returnCode,
        customerId: rma.customerId,
        channel: rma.returnChannel,
        approvedAt: rma.updatedAt,
        cancelledAt: now,
      });

      this.logger.log(
        `[WORKFLOW_TIMEOUT] Đã tự động hủy hồ sơ RMA quá hạn ${rma.returnCode} (ID: ${rma.id})`,
      );
    }

    return {
      expiredCount: expiredReturnOrders.length,
      expiredReturnOrders,
    };
  }

  /**
   * 2. Kịch bản SLA Cảnh Báo KCS 48h:
   * Quét các yêu cầu RMA đã tiếp nhận hàng vào kho (RECEIVED) quá 48h mà chưa có biên bản KCS.
   * Phát sinh cảnh báo khẩn cấp tới Trưởng bộ phận Kho & CSKH.
   */
  async checkQcSlaBreaches(
    thresholdHours = 48,
    referenceDate = new Date(),
  ): Promise<QcSlaBreachResult> {
    const cutoffDate = new Date(referenceDate.getTime() - thresholdHours * 60 * 60 * 1000);

    const candidates = await this.prisma.returnOrder.findMany({
      where: {
        status: ReturnOrderStatus.RECEIVED,
      },
      include: {
        receipts: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        inspections: true,
      },
    });

    const breachedReturnOrders: QcSlaBreachResult['breachedReturnOrders'] = [];

    for (const rma of candidates) {
      if (rma.inspections && rma.inspections.length > 0) {
        continue;
      }

      const latestReceipt = rma.receipts?.[0];
      const receivedAt = latestReceipt ? latestReceipt.createdAt : rma.updatedAt;

      if (receivedAt <= cutoffDate) {
        const diffMs = referenceDate.getTime() - receivedAt.getTime();
        const hoursOverdue = Math.floor(diffMs / (1000 * 60 * 60));

        await this.prisma.$transaction(async (tx) => {
          await tx.outboxEvent.create({
            data: {
              aggregateType: 'RETURN_ORDER',
              aggregateId: rma.id,
              eventType: 'RMA_QC_SLA_BREACHED',
              payload: {
                returnOrderId: rma.id,
                returnCode: rma.returnCode,
                storeId: rma.storeId,
                receivedAt,
                hoursOverdue,
                thresholdHours,
              },
            },
          });
        });

        breachedReturnOrders.push({
          id: rma.id,
          returnCode: rma.returnCode,
          storeId: rma.storeId,
          receivedAt,
          hoursOverdue,
        });

        this.logger.warn(
          `[QC_SLA_BREACH] Hồ sơ ${rma.returnCode} đã lưu kho ${hoursOverdue}h chưa kiểm định KCS (vượt ngưỡng ${thresholdHours}h)`,
        );
      }
    }

    return {
      breachCount: breachedReturnOrders.length,
      breachedReturnOrders,
    };
  }

  /**
   * 3. Kịch bản Tự Động Bồi Thường Khi Mất Hàng Chiều Về (TC-RMA-19):
   * Khi hãng vận chuyển (GHN/3PL) báo bưu kiện thu gom bị thất lạc (LOST):
   * - Tự động kích hoạt luồng hoàn tiền đầy đủ cho khách hàng.
   * - Tạo hồ sơ yêu cầu hãng vận chuyển bồi hoàn (CarrierClaim).
   * - Chuyển trạng thái RMA sang COMPLETED.
   */
  async handleLostReturnPackage(
    shipmentId: string,
    options?: { reason?: string; claimAmount?: number; operatorUserId?: string },
  ): Promise<LostPackageResolutionResult> {
    const shipment = await this.prisma.shipment.findUnique({
      where: { id: shipmentId },
      include: {
        returnOrder: {
          include: {
            order: {
              include: {
                items: true,
                payments: true,
                customer: true,
              },
            },
            items: true,
            refunds: true,
          },
        },
      },
    });

    if (!shipment) {
      throw new NotFoundException(`Không tìm thấy vận đơn thu hồi với ID: ${shipmentId}`);
    }

    if (!shipment.returnOrder) {
      throw new BadRequestException(`Vận đơn ${shipment.shipmentCode} không gắn liền với hồ sơ RMA nào`);
    }

    const rma = shipment.returnOrder;

    const itemsToRefund = rma.items.map((it) => ({
      orderItemId: it.orderItemId,
      returnItemId: it.id,
      quantity: it.quantity,
      reasonCode: it.reasonCode || ReturnReasonCode.DEFECTIVE,
    }));

    const calcResult = this.refundCalculatorService.calculateRefund(
      rma.order,
      itemsToRefund,
      rma.returnChannel,
      { returnShippingFee: 0 },
    );

    const totalCashToRefund = calcResult.netRefundAmount;
    const finalClaimAmount = options?.claimAmount ?? totalCashToRefund;

    return await this.prisma.$transaction(async (tx) => {
      // 1. Cập nhật trạng thái vận đơn sang LOST
      await tx.shipment.update({
        where: { id: shipment.id },
        data: {
          status: 'LOST',
          carrierMetadata: {
            ...((shipment.carrierMetadata as any) || {}),
            lostReason: options?.reason || 'Hãng vận chuyển báo thất lạc bưu kiện thu gom (TC-RMA-19)',
            lostReportedAt: new Date().toISOString(),
          },
        },
      });

      // 2. Tạo bản ghi bồi hoàn từ hãng vận chuyển (CarrierClaim)
      const claimCode = `CLM-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
      const claim = await tx.carrierClaim.create({
        data: {
          claimCode,
          returnOrderId: rma.id,
          shipmentId: shipment.id,
          carrierCode: shipment.carrierCode,
          claimType: 'LOST_IN_TRANSIT',
          claimAmount: finalClaimAmount,
          status: 'PENDING',
          notes: options?.reason || 'Hãng vận chuyển làm mất kiện hàng thu gom, khởi tạo bồi hoàn 3PL theo quy định.',
        },
      });

      // 3. Tạo lệnh hoàn tiền cho khách hàng (Refund & RefundItems)
      const refund = await tx.refund.create({
        data: {
          orderId: rma.orderId,
          returnOrderId: rma.id,
          amount: totalCashToRefund,
          status: 'COMPLETED',
          reason: `[CARRIER_LOST] Hãng vận chuyển ${shipment.carrierCode} làm thất lạc kiện hàng thu hồi (TC-RMA-19)`,
          processedBy: options?.operatorUserId,
          processedAt: new Date(),
          items: {
            create: calcResult.items.map((it) => ({
              orderItemId: it.orderItemId,
              returnItemId: it.returnItemId,
              amount: it.lineRefundCash,
              pointsRestored: it.pointsToRestore,
            })),
          },
        },
      });

      // 4. Cập nhật ReturnOrder sang COMPLETED
      await tx.returnOrder.update({
        where: { id: rma.id },
        data: {
          status: ReturnOrderStatus.COMPLETED,
          totalRefundApproved: totalCashToRefund,
          refundAmount: totalCashToRefund,
          adminNote: `[CARRIER_LOST] Kiện hàng thu gom bị mất bởi ${shipment.carrierCode}. Đã hoàn ${totalCashToRefund.toLocaleString('vi-VN')}đ cho khách và lập hồ sơ bồi thường mã ${claimCode} (TC-RMA-19).`,
          version: { increment: 1 },
        },
      });

      // 5. Ghi nhật ký trạng thái
      const defaultUser = await tx.user.findFirst({ select: { id: true } });
      const operatorId = options?.operatorUserId || rma.handledBy || defaultUser?.id;

      if (operatorId) {
        await tx.returnStatusHistory.create({
          data: {
            returnOrderId: rma.id,
            status: ReturnOrderStatus.COMPLETED,
            changedBy: operatorId,
            note: `Đã tự động hoàn tiền cho khách do 3PL làm thất lạc hàng. Khởi tạo khiếu nại bồi hoàn mã ${claimCode}.`,
          },
        });
      }

      // 6. Phát sinh sự kiện Outbox CARRIER_CLAIM_INITIATED
      await tx.outboxEvent.create({
        data: {
          aggregateType: 'CARRIER_CLAIM',
          aggregateId: claim.id,
          eventType: 'CARRIER_CLAIM_INITIATED',
          payload: {
            claimId: claim.id,
            claimCode,
            shipmentId: shipment.id,
            carrierCode: shipment.carrierCode,
            claimAmount: finalClaimAmount,
            returnOrderId: rma.id,
            refundId: refund.id,
          },
        },
      });

      return {
        returnOrderId: rma.id,
        claimId: claim.id,
        claimCode,
        refundId: refund.id,
        refundAmount: totalCashToRefund,
        status: ReturnOrderStatus.COMPLETED,
      };
    });
  }
}
