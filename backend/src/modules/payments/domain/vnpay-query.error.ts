import { ServiceUnavailableException } from '@nestjs/common';

// An unsigned API error is diagnostic information, never payment evidence.
export class VnpayQueryError extends ServiceUnavailableException {
  constructor(
    readonly requestId: string,
    readonly responseCode: string,
  ) {
    super({
      code: 'VNPAY_QUERY_UNAVAILABLE',
      message: `VNPay QueryDR returned unsigned API error ${responseCode}; payment remains unverified`,
      requestId,
      responseCode,
    });
  }
}
