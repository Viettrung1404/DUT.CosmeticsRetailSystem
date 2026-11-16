import { AdminActionMatrixService } from '../admin-action-matrix.service';

describe('AdminActionMatrixService (EP11-T02 AC2)', () => {
  let service: AdminActionMatrixService;

  beforeEach(() => {
    service = new AdminActionMatrixService();
  });

  const foId = '11111111-2222-3333-4444-555555555555';

  it('1. Đơn ALLOCATED chỉ trả về START_PICKING và CANCEL (chưa thể đóng gói)', () => {
    const actions = service.getAvailableActions({ id: foId, status: 'ALLOCATED' });
    expect(actions).toEqual(['START_PICKING', 'CANCEL']);
    expect(actions).not.toContain('COMPLETE_PACKING');
    expect(actions).not.toContain('CONFIRM_HANDOVER');
  });

  it('2. Đơn PICKING chỉ trả về COMPLETE_PICKING', () => {
    const actions = service.getAvailableActions({ id: foId, status: 'PICKING' });
    expect(actions).toEqual(['COMPLETE_PICKING']);
    expect(actions).not.toContain('COMPLETE_PACKING');
  });

  it('3. Đơn PICKED cho phép COMPLETE_PACKING', () => {
    const actions = service.getAvailableActions({ id: foId, status: 'PICKED' });
    expect(actions).toEqual(['COMPLETE_PACKING']);
    expect(actions).not.toContain('START_PICKING');
    expect(actions).not.toContain('CONFIRM_HANDOVER');
  });

  it('4. Đơn PACKED cho phép CONFIRM_HANDOVER', () => {
    const actions = service.getAvailableActions({ id: foId, status: 'PACKED' });
    expect(actions).toEqual(['CONFIRM_HANDOVER']);
    expect(actions).not.toContain('COMPLETE_PACKING');
  });

  it('5. Đơn HANDED_OVER cho phép TRACK_SHIPMENT', () => {
    const actions = service.getAvailableActions({ id: foId, status: 'HANDED_OVER' });
    expect(actions).toEqual(['TRACK_SHIPMENT']);
  });

  it('6. Đơn COMPLETED hoặc CANCELLED trả về mảng rỗng []', () => {
    expect(service.getAvailableActions({ id: foId, status: 'COMPLETED' })).toEqual([]);
    expect(service.getAvailableActions({ id: foId, status: 'CANCELLED' })).toEqual([]);
    expect(service.getAvailableActions({ id: foId, status: 'UNKNOWN' })).toEqual([]);
  });

  it('7. getActionDetails trả về metadata đầy đủ gồm method và endpoint tương ứng', () => {
    const details = service.getActionDetails({ id: foId, status: 'ALLOCATED' });
    expect(details).toHaveLength(2);
    expect(details[0]).toEqual({
      action: 'START_PICKING',
      label: 'Bắt đầu nhặt hàng',
      method: 'POST',
      endpoint: `/api/v1/admin/fulfillment-orders/${foId}/start-picking`,
    });
    expect(details[1]).toEqual({
      action: 'CANCEL',
      label: 'Hủy phân bổ',
      method: 'POST',
      endpoint: `/api/v1/admin/fulfillment-orders/${foId}/cancel`,
    });
  });
});
