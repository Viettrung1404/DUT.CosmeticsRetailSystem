import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CancelExpiredOrdersUseCase } from '../../application/use-cases/cancel-expired-orders.use-case';

@Injectable()
export class OrderExpiryScheduler {
  private readonly logger = new Logger(OrderExpiryScheduler.name);

  constructor(
    private readonly cancelExpiredOrdersUseCase: CancelExpiredOrdersUseCase,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleExpiredOrdersCron() {
    this.logger.debug('Running scheduled task: check and cancel expired PENDING orders');
    try {
      const cancelledCount = await this.cancelExpiredOrdersUseCase.execute();
      if (cancelledCount > 0) {
        this.logger.log(`Scheduled task cancelled ${cancelledCount} expired orders`);
      }
    } catch (error) {
      this.logger.error('Failed to run cancelExpiredOrders schedule', error);
    }
  }
}
