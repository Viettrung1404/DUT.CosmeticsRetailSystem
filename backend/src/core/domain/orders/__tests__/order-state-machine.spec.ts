import { BadRequestException } from '@nestjs/common';
import { OrderStatus } from '../order-status.enum';
import { OrderStateMachine } from '../order-state-machine';

describe('OrderStateMachine (Shared Domain Kernel)', () => {
  describe('Customer Transitions', () => {
    it('should allow customer to cancel order when status is PENDING', () => {
      expect(
        OrderStateMachine.canTransition(
          OrderStatus.PENDING,
          OrderStatus.CANCELLED,
          'CUSTOMER',
        ),
      ).toBe(true);

      expect(() =>
        OrderStateMachine.assertValidTransition(
          OrderStatus.PENDING,
          OrderStatus.CANCELLED,
          'CUSTOMER',
        ),
      ).not.toThrow();
    });

    it('should NOT allow customer to cancel order when status is CONFIRMED', () => {
      expect(
        OrderStateMachine.canTransition(
          OrderStatus.CONFIRMED,
          OrderStatus.CANCELLED,
          'CUSTOMER',
        ),
      ).toBe(false);

      expect(() =>
        OrderStateMachine.assertValidTransition(
          OrderStatus.CONFIRMED,
          OrderStatus.CANCELLED,
          'CUSTOMER',
        ),
      ).toThrow(BadRequestException);
    });

    it('should NOT allow customer to cancel order when status is PROCESSING or SHIPPING', () => {
      expect(
        OrderStateMachine.canTransition(
          OrderStatus.PROCESSING,
          OrderStatus.CANCELLED,
          'CUSTOMER',
        ),
      ).toBe(false);

      expect(
        OrderStateMachine.canTransition(
          OrderStatus.SHIPPING,
          OrderStatus.CANCELLED,
          'CUSTOMER',
        ),
      ).toBe(false);
    });

    it('should NOT allow customer to confirm order', () => {
      expect(
        OrderStateMachine.canTransition(
          OrderStatus.PENDING,
          OrderStatus.CONFIRMED,
          'CUSTOMER',
        ),
      ).toBe(false);
    });
  });

  describe('Admin Transitions', () => {
    it('should allow admin to advance order lifecycle step by step', () => {
      expect(
        OrderStateMachine.canTransition(
          OrderStatus.PENDING,
          OrderStatus.CONFIRMED,
          'ADMIN',
        ),
      ).toBe(true);

      expect(
        OrderStateMachine.canTransition(
          OrderStatus.CONFIRMED,
          OrderStatus.PROCESSING,
          'ADMIN',
        ),
      ).toBe(true);

      expect(
        OrderStateMachine.canTransition(
          OrderStatus.PROCESSING,
          OrderStatus.SHIPPING,
          'ADMIN',
        ),
      ).toBe(true);

      expect(
        OrderStateMachine.canTransition(
          OrderStatus.SHIPPING,
          OrderStatus.DELIVERED,
          'ADMIN',
        ),
      ).toBe(true);

      expect(
        OrderStateMachine.canTransition(
          OrderStatus.DELIVERED,
          OrderStatus.COMPLETED,
          'ADMIN',
        ),
      ).toBe(true);
    });

    it('should allow admin to cancel order from PENDING, CONFIRMED, or PROCESSING', () => {
      expect(
        OrderStateMachine.canTransition(
          OrderStatus.PENDING,
          OrderStatus.CANCELLED,
          'ADMIN',
        ),
      ).toBe(true);

      expect(
        OrderStateMachine.canTransition(
          OrderStatus.CONFIRMED,
          OrderStatus.CANCELLED,
          'ADMIN',
        ),
      ).toBe(true);

      expect(
        OrderStateMachine.canTransition(
          OrderStatus.PROCESSING,
          OrderStatus.CANCELLED,
          'ADMIN',
        ),
      ).toBe(true);
    });

    it('should NOT allow admin to cancel order once SHIPPED or DELIVERED (must use return process)', () => {
      expect(
        OrderStateMachine.canTransition(
          OrderStatus.SHIPPING,
          OrderStatus.CANCELLED,
          'ADMIN',
        ),
      ).toBe(false);

      expect(
        OrderStateMachine.canTransition(
          OrderStatus.DELIVERED,
          OrderStatus.CANCELLED,
          'ADMIN',
        ),
      ).toBe(false);
    });

    it('should NOT allow transitions from terminal states CANCELLED or COMPLETED to earlier states', () => {
      expect(
        OrderStateMachine.canTransition(
          OrderStatus.CANCELLED,
          OrderStatus.CONFIRMED,
          'ADMIN',
        ),
      ).toBe(false);

      expect(
        OrderStateMachine.canTransition(
          OrderStatus.COMPLETED,
          OrderStatus.PENDING,
          'ADMIN',
        ),
      ).toBe(false);
    });
  });

  describe('System (Scheduler / Worker) Transitions', () => {
    it('should allow system to cancel timed-out PENDING orders', () => {
      expect(
        OrderStateMachine.canTransition(
          OrderStatus.PENDING,
          OrderStatus.CANCELLED,
          'SYSTEM',
        ),
      ).toBe(true);
    });

    it('should NOT allow system to alter CONFIRMED or SHIPPING orders', () => {
      expect(
        OrderStateMachine.canTransition(
          OrderStatus.CONFIRMED,
          OrderStatus.CANCELLED,
          'SYSTEM',
        ),
      ).toBe(false);
    });
  });
});
