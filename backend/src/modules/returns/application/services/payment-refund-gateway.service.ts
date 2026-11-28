import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { ReturnOrderStatus } from '../../domain/entities/return-policy.entity';
import { PaymentRefundGatewayAdapter } from '../../infrastructure/adapters/payment-refund-gateway.adapter';

export interface ExecuteRefundResult {
  success: boolean;
  status: string;
  refund: any;
  gatewayTransactionId?: string;
  message?: string;
}

@Injectable()
export class PaymentRefundGatewayService {
  private readonly logger = new Logger(PaymentRefundGatewayService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gatewayAdapter: PaymentRefundGatewayAdapter,
  ) {}

  /**
   * Kích hoạt chuyển khoản hoàn tiền qua cổng thanh toán / ủy nhiệm chi (EP16-T03)
   */
  async executeRefund(
    refundId: string,
    operatorUserId: string,
    idempotencyKey?: string,
  ): Promise<ExecuteRefundResult> {
    const key = idempotencyKey || `REF-EXEC-${refundId}`;

    // 1. Kiểm tra lệnh hoàn tiền
    const refund = await this.prisma.refund.findUnique({
      where: { id: refundId },
      include: {
        order: {
          include: {
            payments: true,
            customer: true,
          },
        },
        returnOrder: true,
        items: true,
      },
    });

    if (!refund) {
      throw new NotFoundException(`Không tìm thấy lệnh hoàn tiền: ${refundId}`);
    }

    // 2. Bảo vệ Idempotency: Click đúp không bị hoàn tiền 2 lần (TC-RMA-12, AC1)
    if (refund.status === 'COMPLETED') {
      this.logger.warn(
        `[IDEMPOTENT_HIT] Lệnh hoàn tiền ${refundId} đã hoàn tất trước đó, bỏ qua giao dịch trùng lặp`,
      );
      return {
        success: true,
        status: 'COMPLETED',
        refund,
        gatewayTransactionId: refund.refundTransactionId || undefined,
        message: 'Lệnh hoàn tiền đã được xử lý hoàn tất trước đó',
      };
    }

    // 3. Xác định phương thức thanh toán của đơn hàng gốc
    const successfulPayment = refund.order.payments.find(
      (p) => p.status === 'PAID',
    );
    const paymentMethod = successfulPayment
      ? successfulPayment.paymentMethod
      : refund.order.orderType === 'POS'
        ? 'CASH'
        : 'COD';

    // 4. Kích hoạt giao dịch hoàn tiền qua Cổng thanh toán
    let gatewayRes;
    try {
      gatewayRes = await this.gatewayAdapter.executeRefund({
        refundId: refund.id,
        orderId: refund.orderId,
        amount: Number(refund.amount),
        paymentMethod,
        originalTransactionId: successfulPayment?.transactionId || undefined,
        reason: refund.reason,
        idempotencyKey: key,
      });
    } catch (error: any) {
      // AC2 (TC-RMA-11): Lỗi mạng/5xx từ cổng thanh toán không làm crash luồng;
      // Chuyển status = 'PROCESSING' để điều phối viên đối soát
      this.logger.error(
        `[GATEWAY_ERROR] Lỗi kết nối cổng thanh toán khi hoàn tiền ${refundId}: ${error.message}`,
        error.stack,
      );

      const failedRefund = await this.prisma.refund.update({
        where: { id: refund.id },
        data: {
          status: 'PROCESSING',
          reason: `${refund.reason} | [GATEWAY_ERROR: ${error.message}]`,
        },
      });

      return {
        success: false,
        status: 'PROCESSING',
        refund: failedRefund,
        message: `Lỗi kết nối cổng thanh toán: ${error.message}. Trạng thái giữ PROCESSING để đối soát.`,
      };
    }

    if (!gatewayRes.success) {
      const failedRefund = await this.prisma.refund.update({
        where: { id: refund.id },
        data: {
          status: 'PROCESSING',
          reason: `${refund.reason} | [GATEWAY_DECLINED: ${gatewayRes.message}]`,
        },
      });

      return {
        success: false,
        status: 'PROCESSING',
        refund: failedRefund,
        message: gatewayRes.message,
      };
    }

    // 5. Giao dịch thành công: Thực thi ACID cập nhật toàn bộ trạng thái hệ thống
    const updatedResult = await this.prisma.$transaction(async (tx) => {
      // 5.1 Cập nhật Refund sang COMPLETED
      const completedRefund = await tx.refund.update({
        where: { id: refund.id },
        data: {
          status: 'COMPLETED',
          refundTransactionId: gatewayRes.gatewayTransactionId,
          processedAt: new Date(),
          processedBy: operatorUserId,
          eventKey: key,
        },
      });

      // 5.2 Khôi phục điểm thưởng tích lũy (Loyalty Points) vào ví khách hàng (AC3)
      const totalPointsToRestore = refund.items.reduce(
        (sum, it) => sum + (it.pointsRestored || 0),
        0,
      );

      if (totalPointsToRestore > 0 && refund.order.customerId) {
        await tx.customer.update({
          where: { id: refund.order.customerId },
          data: {
            totalPoints: { increment: totalPointsToRestore },
          },
        });

        await tx.loyaltyPointsTransaction.create({
          data: {
            customerId: refund.order.customerId,
            orderId: refund.orderId,
            points: totalPointsToRestore,
            type: 'REFUND_RESTORE',
            description: `Hoàn trả điểm tích lũy từ hồ sơ RMA ${refund.returnOrder?.returnCode || refund.id}`,
            eventKey: `PT-RESTORE-${refund.id}`,
          },
        });
      }

      // 5.3 Cập nhật trạng thái ReturnOrder sang COMPLETED
      let updatedReturnOrder: any = null;
      if (refund.returnOrderId) {
        updatedReturnOrder = await tx.returnOrder.update({
          where: { id: refund.returnOrderId },
          data: {
            status: ReturnOrderStatus.COMPLETED,
            handledBy: operatorUserId,
          },
        });

        // 5.4 Ghi log lịch sử trạng thái hồ sơ đổi trả
        await tx.returnStatusHistory.create({
          data: {
            returnOrderId: refund.returnOrderId,
            status: ReturnOrderStatus.COMPLETED,
            changedBy: operatorUserId,
            note: `Hoàn tất giải ngân hoàn tiền (${Number(refund.amount).toLocaleString()}đ) qua ${paymentMethod}`,
          },
        });
      }

      // 5.5 Ghi nhận sự kiện Outbox REFUND_COMPLETED
      await tx.outboxEvent.create({
        data: {
          aggregateType: 'REFUND',
          aggregateId: refund.id,
          eventType: 'REFUND_COMPLETED',
          payload: {
            refundId: refund.id,
            returnOrderId: refund.returnOrderId,
            orderId: refund.orderId,
            amount: Number(refund.amount),
            paymentMethod,
            gatewayTransactionId: gatewayRes.gatewayTransactionId,
            pointsRestored: totalPointsToRestore,
            operatorUserId,
          },
        },
      });

      return {
        refund: completedRefund,
        returnOrder: updatedReturnOrder,
        pointsRestored: totalPointsToRestore,
      };
    });

    return {
      success: true,
      status: 'COMPLETED',
      refund: updatedResult.refund,
      gatewayTransactionId: gatewayRes.gatewayTransactionId,
      message: 'Giao dịch hoàn tiền đã được thực hiện thành công',
    };
  }

  /**
   * Phê duyệt lệnh hoàn tiền (Dành cho kế toán / quản lý phê duyệt trước khi chuyển tiền)
   */
  async approveRefund(
    refundId: string,
    approverUserId: string,
    note?: string,
  ) {
    const refund = await this.prisma.refund.findUnique({
      where: { id: refundId },
    });

    if (!refund) {
      throw new NotFoundException(`Không tìm thấy lệnh hoàn tiền: ${refundId}`);
    }

    if (refund.status !== 'PENDING') {
      throw new BadRequestException(
        `Chỉ có thể phê duyệt lệnh hoàn tiền ở trạng thái PENDING. Trạng thái hiện tại: ${refund.status}`,
      );
    }

    const updated = await this.prisma.refund.update({
      where: { id: refundId },
      data: {
        status: 'APPROVED',
        processedBy: approverUserId,
        reason: note
          ? `${refund.reason || ''} [Phê duyệt: ${note}]`.trim()
          : refund.reason,
      },
    });

    return updated;
  }
}
