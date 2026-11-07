import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CART_REPOSITORY, ICartRepository } from '../../domain/repositories/cart.repository.interface';

@Injectable()
export class CartCleanupService {
  private readonly logger = new Logger(CartCleanupService.name);

  /** Number of days after which a guest cart is considered expired */
  private static readonly GUEST_CART_TTL_DAYS = 30;

  constructor(
    @Inject(CART_REPOSITORY)
    private readonly cartRepository: ICartRepository,
  ) {}

  /**
   * Run every day at 3:00 AM — delete guest carts (customerId = NULL)
   * that haven't been updated in the last 30 days.
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanupExpiredGuestCarts(): Promise<void> {
    try {
      const deleted = await this.cartRepository.deleteExpiredGuestCarts(
        CartCleanupService.GUEST_CART_TTL_DAYS,
      );

      if (deleted > 0) {
        this.logger.log(`Cleaned up ${deleted} expired guest cart(s) older than ${CartCleanupService.GUEST_CART_TTL_DAYS} days`);
      }
    } catch (error) {
      this.logger.error('Failed to cleanup expired guest carts', error instanceof Error ? error.stack : error);
    }
  }
}
