import { Injectable, Inject, Logger } from '@nestjs/common';
import {
  ORDER_REPOSITORY,
  IOrderRepository,
} from '../../domain/repositories/order.repository.interface';

@Injectable()
export class CancelExpiredOrdersUseCase {
  private readonly logger = new Logger(CancelExpiredOrdersUseCase.name);

  // Sprint 2: 30 minutes for COD orders (FR-02.06)
  // NOTE: When Sprint 3 introduces VNPay/MoMo, online payment orders will expire in 15 minutes (BR-07)
  private readonly EXPIRY_MINUTES_COD = 30;

  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepo: IOrderRepository,
  ) {}

  async execute(): Promise<number> {
    const cutoffDate = new Date(
      Date.now() - this.EXPIRY_MINUTES_COD * 60 * 1000,
    );

    const cancelledCount =
      await this.orderRepo.cancelExpiredPendingOrders(cutoffDate);

    if (cancelledCount > 0) {
      this.logger.log(
        `[ORDER_AUTO_CANCEL] Successfully cancelled ${cancelledCount} expired PENDING orders created before ${cutoffDate.toISOString()}`,
      );
    }

    return cancelledCount;
  }
}
