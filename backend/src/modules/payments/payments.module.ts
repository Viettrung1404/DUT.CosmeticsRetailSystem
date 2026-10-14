import { Module } from '@nestjs/common';
import {
  PaymentsService,
  PAYMENT_GATEWAYS,
} from './application/services/payments.service';
import { PaymentsController } from './presentation/controllers/payments.controller';
import { PaymentCallbacksController } from './presentation/controllers/payment-callbacks.controller';
import { PaymentWorker } from './infrastructure/workers/payment-worker';
import {
  MomoAdapter,
  VnpayAdapter,
  ZalopayAdapter,
} from './infrastructure/gateways/gateway-adapters';
import { createGatewayTransport } from './infrastructure/gateways/gateway-http.transport';
@Module({
  controllers: [PaymentsController, PaymentCallbacksController],
  providers: [
    PaymentsService,
    PaymentWorker,
    {
      provide: PAYMENT_GATEWAYS,
      useFactory: () => {
        const env = process.env as Record<string, string>;
        return {
          MOMO: new MomoAdapter(env, createGatewayTransport('MOMO')),
          VNPAY: new VnpayAdapter(env, createGatewayTransport('VNPAY')),
          ZALOPAY: new ZalopayAdapter(env, createGatewayTransport('ZALOPAY')),
        };
      },
    },
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
