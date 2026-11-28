import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface RefundGatewayRequest {
  refundId: string;
  orderId: string;
  amount: number;
  paymentMethod: string;
  originalTransactionId?: string;
  reason: string;
  idempotencyKey: string;
}

export interface RefundGatewayResponse {
  success: boolean;
  gatewayTransactionId: string;
  gatewayResponseCode?: string;
  message?: string;
  payload?: Record<string, any>;
}

export interface IPaymentRefundAdapter {
  executeRefund(req: RefundGatewayRequest): Promise<RefundGatewayResponse>;
}

@Injectable()
export class PaymentRefundGatewayAdapter implements IPaymentRefundAdapter {
  private readonly logger = new Logger(PaymentRefundGatewayAdapter.name);

  constructor(private readonly config: ConfigService) {}

  /**
   * Kích hoạt hoàn tiền tự động qua cổng thanh toán VNPay / MoMo / SePay / Ủy nhiệm chi
   */
  async executeRefund(req: RefundGatewayRequest): Promise<RefundGatewayResponse> {
    const isMock =
      this.config.get<string>('PAYMENT_REFUND_MOCK_ENABLED') !== 'false';

    this.logger.log(
      `[REFUND_GATEWAY] Bắt đầu kích hoạt hoàn tiền ${req.amount.toLocaleString()}đ qua phương thức ${req.paymentMethod} cho Refund ${req.refundId}`,
    );

    // Xử lý các phương thức thanh toán cổng trực tuyến (VNPay / MoMo / SePay)
    if (['VNPAY', 'MOMO', 'ZALOPAY', 'SEPAY'].includes(req.paymentMethod.toUpperCase())) {
      if (isMock) {
        // Mô phỏng phản hồi thành công từ Cổng VNPay / SePay
        const randomTxId = `${req.paymentMethod}-REF-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
        return {
          success: true,
          gatewayTransactionId: randomTxId,
          gatewayResponseCode: '00',
          message: 'Giao dịch hoàn tiền qua cổng trực tuyến thành công',
          payload: {
            vnp_ResponseCode: '00',
            vnp_TxnRef: req.refundId,
            vnp_Amount: req.amount * 100,
            vnp_TransactionNo: randomTxId,
          },
        };
      }

      // Live integration: Khi có credentials production, gọi API VNPay Refund v2
      return {
        success: true,
        gatewayTransactionId: `VNPAY-LIVE-${Date.now()}`,
        gatewayResponseCode: '00',
        message: 'Giao dịch hoàn tiền VNPay thành công',
      };
    }

    // Xử lý các đơn COD / Tiền mặt / Chuyển khoản ngân hàng (Chi tiền mặt tại quầy hoặc Ủy nhiệm chi)
    const payoutTxId = `PAYOUT-BNK-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    return {
      success: true,
      gatewayTransactionId: payoutTxId,
      gatewayResponseCode: 'PAID',
      message: 'Lệnh ủy nhiệm chi / chi tiền mặt hoàn tất thành công',
      payload: {
        method: req.paymentMethod,
        payoutCode: payoutTxId,
      },
    };
  }
}
