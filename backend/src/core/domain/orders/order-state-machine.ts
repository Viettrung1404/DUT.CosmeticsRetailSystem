import { BadRequestException } from '@nestjs/common';
import { OrderStatus, OrderActor } from './order-status.enum';

export class OrderStateMachine {
  /**
   * Allowed state transitions map.
   * Defines the natural order lifecycle and permitted branching paths.
   */
  private static readonly ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
    [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
    [OrderStatus.CONFIRMED]: [
      OrderStatus.PROCESSING,
      OrderStatus.CANCELLED,
    ],
    [OrderStatus.PROCESSING]: [
      OrderStatus.SHIPPING,
      OrderStatus.CANCELLED,
    ],
    [OrderStatus.SHIPPING]: [OrderStatus.DELIVERED, OrderStatus.RETURNED],
    [OrderStatus.DELIVERED]: [OrderStatus.COMPLETED, OrderStatus.RETURNED],
    [OrderStatus.COMPLETED]: [OrderStatus.RETURNED],
    [OrderStatus.CANCELLED]: [],
    [OrderStatus.RETURNED]: [],
  };

  /**
   * Evaluates if a state transition is valid based on lifecycle and actor permissions.
   */
  static canTransition(
    current: OrderStatus,
    target: OrderStatus,
    actor: OrderActor,
  ): boolean {
    const validTargets = this.ALLOWED_TRANSITIONS[current] || [];
    if (!validTargets.includes(target)) {
      return false;
    }

    // Role-based constraints:
    switch (actor) {
      case 'CUSTOMER':
        // Customers are ONLY permitted to cancel when order is in PENDING state
        return current === OrderStatus.PENDING && target === OrderStatus.CANCELLED;

      case 'SYSTEM':
        // Automated workers/schedulers can cancel expired PENDING orders
        return current === OrderStatus.PENDING && target === OrderStatus.CANCELLED;

      case 'ADMIN':
        // Admins can execute standard lifecycle operations per ALLOWED_TRANSITIONS
        return true;

      default:
        return false;
    }
  }

  /**
   * Asserts valid transition or throws standard BadRequestException with readable message.
   */
  static assertValidTransition(
    current: OrderStatus,
    target: OrderStatus,
    actor: OrderActor,
  ): void {
    if (!this.canTransition(current, target, actor)) {
      throw new BadRequestException(
        `Không thể chuyển trạng thái đơn hàng từ ${current} sang ${target} bởi vai trò ${actor}`,
      );
    }
  }
}
