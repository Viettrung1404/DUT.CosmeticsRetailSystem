import { ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaShipmentRepository } from '../prisma-shipment.repository';

const T0 = new Date('2026-11-09T03:00:00Z');
const T1 = new Date('2026-11-09T04:00:00Z');

function setup(opts: { orderStatus?: string; shipmentStatus?: string; duplicate?: unknown; latest?: unknown; creator?: string | null } = {}) {
  const shipment = {
    id: 's1',
    shipmentCode: 'VD1',
    carrierMetadata: opts.creator === null ? {} : { createdBy: opts.creator ?? 'creator' },
    status: opts.shipmentStatus ?? 'READY_TO_SHIP',
  };
  const tx = {
    shipment: {
      findFirst: jest.fn().mockResolvedValue({ id: 's1', orderId: 'o1' }),
      findUniqueOrThrow: jest.fn().mockResolvedValue(shipment),
      update: jest.fn(),
    },
    shipmentEvent: {
      findUnique: jest.fn().mockResolvedValue(opts.duplicate ?? null),
      findFirst: jest.fn().mockResolvedValue(opts.latest ?? null),
    },
    payment: { updateMany: jest.fn() },
    $queryRaw: jest.fn().mockResolvedValueOnce([{ id: 'o1', status: opts.orderStatus ?? 'PROCESSING' }]).mockResolvedValue([]),
  };
  const prisma = { transaction: jest.fn((fn: (t: unknown) => unknown) => fn(tx)) };
  const integration = { shipmentChanged: jest.fn() };
  const orders = {
    applyStatusChange: jest.fn(async (_tx: unknown, i: { target: string }) => ({ autoCompleted: i.target === 'DELIVERED' })),
  };
  const repo = new PrismaShipmentRepository(prisma as never, integration as never, orders as never);
  const event = (status: string, eventId = 'E1', occurredAt = T1) => ({
    carrierCode: 'MOCK',
    eventId,
    trackingCode: 'MOCK1',
    status,
    occurredAt,
  });
  return { tx, repo, integration, orders, event };
}

describe('PrismaShipmentRepository.applyCarrierEvent', () => {
  it('hãng lấy hàng -> đơn PROCESSING sang SHIPPING bằng logic đổi trạng thái đơn có sẵn, ghi handedOverAt', async () => {
    const s = setup();
    const result = await s.repo.applyCarrierEvent(s.event('PICKED_UP'));
    expect(s.orders.applyStatusChange).toHaveBeenCalledWith(s.tx, expect.objectContaining({ orderId: 'o1', target: 'SHIPPING', changedBy: 'creator' }));
    expect(s.integration.shipmentChanged).toHaveBeenCalledWith(s.tx, expect.objectContaining({ shipmentId: 's1', status: 'PICKED_UP', eventId: 'E1' }));
    expect(s.tx.shipment.update).toHaveBeenCalledWith({ where: { id: 's1' }, data: { handedOverAt: T1 } });
    expect(result).toEqual(expect.objectContaining({ duplicate: false, orderStatus: 'SHIPPING', status: 'PICKED_UP' }));
  });

  it('giao thành công -> đơn SHIPPING sang DELIVERED (thu COD), ghi deliveredAt', async () => {
    const s = setup({ orderStatus: 'SHIPPING', shipmentStatus: 'DELIVERING' });
    const result = await s.repo.applyCarrierEvent(s.event('DELIVERED'));
    expect(s.orders.applyStatusChange).toHaveBeenCalledWith(s.tx, expect.objectContaining({ target: 'DELIVERED' }));
    expect(s.tx.shipment.update).toHaveBeenCalledWith({ where: { id: 's1' }, data: { deliveredAt: T1 } });
    expect(result.orderStatus).toBe('COMPLETED');
  });

  it('giao thất bại -> tăng failed_attempts, không đổi đơn', async () => {
    const s = setup({ orderStatus: 'SHIPPING', shipmentStatus: 'DELIVERING' });
    await s.repo.applyCarrierEvent(s.event('DELIVERY_FAILED'));
    expect(s.orders.applyStatusChange).not.toHaveBeenCalled();
    expect(s.tx.shipment.update).toHaveBeenCalledWith({ where: { id: 's1' }, data: { failedAttempts: { increment: 1 } } });
  });

  it('đang giao không đổi đơn', async () => {
    const s = setup({ orderStatus: 'SHIPPING', shipmentStatus: 'PICKED_UP' });
    await s.repo.applyCarrierEvent(s.event('DELIVERING'));
    expect(s.orders.applyStatusChange).not.toHaveBeenCalled();
  });

  it('hoàn hàng về shop -> đơn sang RETURNED và hủy khoản COD đang chờ', async () => {
    const s = setup({ orderStatus: 'SHIPPING', shipmentStatus: 'RETURNING' });
    const result = await s.repo.applyCarrierEvent(s.event('RETURNED'));
    expect(s.orders.applyStatusChange).toHaveBeenCalledWith(s.tx, expect.objectContaining({ target: 'RETURNED' }));
    expect(s.tx.payment.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'CANCELLED' }, where: expect.objectContaining({ paymentMethod: 'COD', status: 'PENDING' }) }),
    );
    expect(result.orderStatus).toBe('RETURNED');
  });

  it('chống trùng: gửi lại cùng eventId -> không đổi đơn, không đổi vận đơn', async () => {
    const s = setup({ shipmentStatus: 'PICKED_UP', orderStatus: 'SHIPPING', duplicate: { id: 'ev' } });
    const result = await s.repo.applyCarrierEvent(s.event('PICKED_UP'));
    expect(result.duplicate).toBe(true);
    expect(s.orders.applyStatusChange).not.toHaveBeenCalled();
    expect(s.tx.shipment.update).not.toHaveBeenCalled();
  });

  it('chuyển trạng thái sai thứ tự -> 409, không ghi gì', async () => {
    const s = setup();
    await expect(s.repo.applyCarrierEvent(s.event('DELIVERED'))).rejects.toThrow(ConflictException);
    expect(s.orders.applyStatusChange).not.toHaveBeenCalled();
    expect(s.integration.shipmentChanged).not.toHaveBeenCalled();
  });

  it('sự kiện cũ hơn sự kiện đã ghi -> 409', async () => {
    const s = setup({ latest: { occurredAt: T1 } });
    await expect(s.repo.applyCarrierEvent(s.event('PICKED_UP', 'E2', T0))).rejects.toThrow('SHIPMENT_EVENT_STALE');
  });

  it('lấy hàng nhưng đơn không còn PROCESSING (đã bị hủy) -> 409, không trừ kho', async () => {
    const s = setup({ orderStatus: 'CANCELLED' });
    await expect(s.repo.applyCarrierEvent(s.event('PICKED_UP'))).rejects.toThrow('SHIPMENT_ORDER_STATE_INVALID');
    expect(s.orders.applyStatusChange).not.toHaveBeenCalled();
  });

  it('không tìm thấy mã vận chuyển -> 404', async () => {
    const s = setup();
    s.tx.shipment.findFirst.mockResolvedValue(null);
    await expect(s.repo.applyCarrierEvent(s.event('PICKED_UP'))).rejects.toThrow(NotFoundException);
  });

  it('vận đơn thiếu người tạo thì không đổi đơn tự động được', async () => {
    const s = setup({ creator: null });
    await expect(s.repo.applyCarrierEvent(s.event('PICKED_UP'))).rejects.toThrow('SHIPMENT_CREATOR_MISSING');
  });
});
