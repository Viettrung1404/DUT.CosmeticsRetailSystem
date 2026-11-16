import { Injectable } from '@nestjs/common';

export interface ActionMetadata {
  action: string;
  label: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  endpoint: string;
}

@Injectable()
export class AdminActionMatrixService {
  /**
   * Tính toán danh sách hành động hợp lệ (availableActions) dựa trên trạng thái thực tế
   * của FulfillmentOrder và phân quyền người dùng (DES-07 EP11-T02 AC2).
   */
  getAvailableActions(
    fo: { id: string; status: string; assignedPickerId?: string | null },
    user?: { userId?: string; roleName?: string; permissionCodes?: string[] },
  ): string[] {
    const status = fo.status?.toUpperCase();

    switch (status) {
      case 'ALLOCATED':
        // Đơn đã phân bổ tồn kho FEFO -> Cho phép bắt đầu nhặt hàng hoặc hủy đơn
        return ['START_PICKING', 'CANCEL'];

      case 'PICKING':
        // Đang nhặt hàng -> Cho phép hoàn tất nhặt hàng
        return ['COMPLETE_PICKING'];

      case 'PICKED':
        // Đã nhặt xong -> Cho phép hoàn tất đóng gói tạo kiện
        return ['COMPLETE_PACKING'];

      case 'PACKED':
        // Đã đóng gói xong -> Cho phép xác nhận bàn giao cho tài xế/bưu tá 3PL
        return ['CONFIRM_HANDOVER'];

      case 'HANDED_OVER':
        // Đã bàn giao cho vận chuyển -> Cho phép tra cứu tiến độ vận đơn
        return ['TRACK_SHIPMENT'];

      case 'COMPLETED':
      case 'CANCELLED':
      default:
        // Đã hoàn tất hoặc bị hủy -> Không còn hành động nào khả dụng
        return [];
    }
  }

  /**
   * Trả về chi tiết metadata của từng hành động (phục vụ Render UI linh hoạt trên Portal)
   */
  getActionDetails(
    fo: { id: string; status: string; assignedPickerId?: string | null },
    user?: { userId?: string; roleName?: string; permissionCodes?: string[] },
  ): ActionMetadata[] {
    const actions = this.getAvailableActions(fo, user);
    const metadataMap: Record<string, Omit<ActionMetadata, 'action'>> = {
      START_PICKING: {
        label: 'Bắt đầu nhặt hàng',
        method: 'POST',
        endpoint: `/api/v1/admin/fulfillment-orders/${fo.id}/start-picking`,
      },
      CANCEL: {
        label: 'Hủy phân bổ',
        method: 'POST',
        endpoint: `/api/v1/admin/fulfillment-orders/${fo.id}/cancel`,
      },
      COMPLETE_PICKING: {
        label: 'Hoàn tất nhặt hàng',
        method: 'POST',
        endpoint: `/api/v1/admin/fulfillment-orders/${fo.id}/complete-picking`,
      },
      COMPLETE_PACKING: {
        label: 'Hoàn tất đóng gói',
        method: 'POST',
        endpoint: `/api/v1/admin/fulfillment-orders/${fo.id}/complete-packing`,
      },
      CONFIRM_HANDOVER: {
        label: 'Xác nhận bàn giao 3PL',
        method: 'POST',
        endpoint: `/api/v1/admin/fulfillment-orders/${fo.id}/confirm-handover`,
      },
      TRACK_SHIPMENT: {
        label: 'Theo dõi vận đơn',
        method: 'GET',
        endpoint: `/api/v1/admin/fulfillment-orders/${fo.id}/shipment`,
      },
    };

    return actions.map((act) => ({
      action: act,
      ...(metadataMap[act] || {
        label: act,
        method: 'POST',
        endpoint: `/api/v1/admin/fulfillment-orders/${fo.id}/${act.toLowerCase().replace(/_/g, '-')}`,
      }),
    }));
  }
}
