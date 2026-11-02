import { ApiProperty } from '@nestjs/swagger';
import { OrderStatus } from '@core/domain/orders/order-status.enum';
export class PaymentMethodsDto {
  @ApiProperty() COD: boolean;
  @ApiProperty() SEPAY: boolean;
}

export class PaymentResultDto {
  @ApiProperty({ format: 'uuid' }) paymentId: string;
  @ApiProperty({ format: 'uuid' }) orderId: string;
  @ApiProperty({ enum: ['SEPAY', 'VNPAY', 'MOMO', 'ZALOPAY', 'COD'] })
  method: string;
  @ApiProperty({
    enum: [
      'PENDING',
      'INITIATING',
      'PAYABLE',
      'UNKNOWN',
      'FAILED',
      'COMPLETED',
      'CANCELLED',
      'NEEDS_REVIEW',
    ],
  })
  status: string;
  @ApiProperty({ type: String, nullable: true }) paymentUrl: string | null;
  @ApiProperty({ type: String, nullable: true }) walletDeeplink: string | null;
  @ApiProperty({ type: String, nullable: true }) qrCodeData: string | null;
  @ApiProperty({ type: String, nullable: true }) returnUrl: string | null;
  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  expiresAt: Date | null;
}
export class PaymentStatusDto extends PaymentResultDto {
  @ApiProperty() paymentStatus: string;
  @ApiProperty({
    enum: OrderStatus,
    description:
      'SePay: PENDING_PAYMENT before payment, PENDING after reconciliation, CONFIRMED after shop confirmation.',
  })
  orderStatus: string;
  @ApiProperty() verificationPending: boolean;
  @ApiProperty() refundPending: boolean;
  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  verificationDeadline: Date | null;
}
