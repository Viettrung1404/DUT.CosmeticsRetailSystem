import { OrderStatus } from '@core/domain/orders/order-status.enum';
import { OrderStateMachine } from '@core/domain/orders/order-state-machine';

// Trạng thái đổi qua PUT /admin/orders/:id/status; CONFIRMED và CANCELLED có API riêng, RETURNED thuộc luồng đổi trả (RMA)
export const ADMIN_STATUS_TARGETS = [
  OrderStatus.PROCESSING,
  OrderStatus.SHIPPING,
  OrderStatus.DELIVERED,
  OrderStatus.COMPLETED,
];

export interface AdminOrderActions {
  canConfirm: boolean;
  nextStatuses: OrderStatus[];
  canCancel: boolean;
}

// Để FE-Admin chỉ hiện nút hợp lệ với trạng thái hiện tại, luật lấy từ OrderStateMachine
export const getAdminOrderActions = (status: string): AdminOrderActions => {
  const current = status as OrderStatus;
  return {
    canConfirm: OrderStateMachine.canTransition(current, OrderStatus.CONFIRMED, 'ADMIN'),
    nextStatuses: ADMIN_STATUS_TARGETS.filter((target) =>
      OrderStateMachine.canTransition(current, target, 'ADMIN'),
    ),
    canCancel: OrderStateMachine.canTransition(current, OrderStatus.CANCELLED, 'ADMIN'),
  };
};
