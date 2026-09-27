import { OrderStatus } from '@core/domain/orders/order-status.enum';
import { OrderStateMachine } from '@core/domain/orders/order-state-machine';

export interface AdminOrderActions {
  canConfirm: boolean;
}

// Để FE-Admin chỉ hiện nút hợp lệ với trạng thái hiện tại, luật lấy từ OrderStateMachine
export const getAdminOrderActions = (status: string): AdminOrderActions => {
  const current = status as OrderStatus;
  return {
    canConfirm: OrderStateMachine.canTransition(current, OrderStatus.CONFIRMED, 'ADMIN'),
  };
};
