import { ApiProperty } from '@nestjs/swagger';
export class PaymentResultDto {
  @ApiProperty({ format: 'uuid' }) paymentId: string;
  @ApiProperty({ format: 'uuid' }) orderId: string;
  @ApiProperty({ enum: ['VNPAY', 'MOMO', 'ZALOPAY', 'COD'] }) method: string;
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
  @ApiProperty() orderStatus: string;
  @ApiProperty() verificationPending: boolean;
  @ApiProperty() refundPending: boolean;
  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  verificationDeadline: Date | null;
}
