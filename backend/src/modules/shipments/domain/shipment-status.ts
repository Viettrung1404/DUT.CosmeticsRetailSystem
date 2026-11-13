export const SHIPMENT_STATUSES = [
  'READY_TO_SHIP',
  'PICKED_UP',
  'DELIVERING',
  'DELIVERY_FAILED',
  'DELIVERED',
  'RETURNING',
  'RETURNED',
  'CANCELLED',
] as const;
export type ShipmentStatus = (typeof SHIPMENT_STATUSES)[number];

const TRANSITIONS: Record<ShipmentStatus, ShipmentStatus[]> = {
  READY_TO_SHIP: ['PICKED_UP', 'CANCELLED'],
  PICKED_UP: ['DELIVERING', 'RETURNING'],
  DELIVERING: ['DELIVERED', 'DELIVERY_FAILED'],
  DELIVERY_FAILED: ['DELIVERING', 'RETURNING'],
  RETURNING: ['RETURNED'],
  DELIVERED: [],
  RETURNED: [],
  CANCELLED: [],
};

export const isShipmentStatus = (v: string): v is ShipmentStatus =>
  (SHIPMENT_STATUSES as readonly string[]).includes(v);

export const nextShipmentStatuses = (from: string): ShipmentStatus[] =>
  isShipmentStatus(from) ? TRANSITIONS[from] : [];

export const canShipmentTransition = (from: string, to: string): boolean =>
  nextShipmentStatuses(from).some((s) => s === to);

// Vận đơn còn hiệu lực = chưa bị hủy; đã giao/hoàn xong thì đơn cũng đã khép lại nên vẫn tính là đã có vận đơn
export const isActiveShipment = (status: string): boolean => status !== 'CANCELLED';

// Chỉ hủy được khi hãng chưa lấy hàng
export const canCancelShipment = (status: string): boolean => status === 'READY_TO_SHIP';

export function codAmountFor(totalAmount: number, completedPaid: number, exchangeCredit = 0): number {
  return Math.max(0, Math.round(totalAmount - completedPaid - exchangeCredit));
}
