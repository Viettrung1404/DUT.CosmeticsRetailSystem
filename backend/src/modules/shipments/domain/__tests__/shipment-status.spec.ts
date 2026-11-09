import { canCancelShipment, canShipmentTransition, codAmountFor, isActiveShipment } from '../shipment-status';

describe('shipment-status', () => {
  it.each([
    ['READY_TO_SHIP', 'PICKED_UP', true],
    ['PICKED_UP', 'DELIVERING', true],
    ['DELIVERING', 'DELIVERED', true],
    ['DELIVERING', 'DELIVERY_FAILED', true],
    ['DELIVERY_FAILED', 'DELIVERING', true],
    ['DELIVERY_FAILED', 'RETURNING', true],
    ['RETURNING', 'RETURNED', true],
    ['READY_TO_SHIP', 'DELIVERED', false],
    ['DELIVERED', 'DELIVERING', false],
    ['CANCELLED', 'PICKED_UP', false],
    ['PICKED_UP', 'CANCELLED', false],
    ['LẠ', 'DELIVERED', false],
  ])('%s -> %s: %s', (from, to, ok) => {
    expect(canShipmentTransition(from, to)).toBe(ok);
  });

  it('chỉ hủy được khi hãng chưa lấy hàng', () => {
    expect(canCancelShipment('READY_TO_SHIP')).toBe(true);
    expect(canCancelShipment('PICKED_UP')).toBe(false);
  });

  it('vận đơn đã hủy không còn hiệu lực', () => {
    expect(isActiveShipment('CANCELLED')).toBe(false);
    expect(isActiveShipment('DELIVERING')).toBe(true);
  });

  it('COD = phần chưa thanh toán, không âm', () => {
    expect(codAmountFor(500000, 0)).toBe(500000);
    expect(codAmountFor(500000, 500000)).toBe(0);
    expect(codAmountFor(500000, 200000, 100000)).toBe(200000);
    expect(codAmountFor(100000, 200000)).toBe(0);
  });
});
