import { Logger } from '@nestjs/common';

const logger = new Logger('GHNStatusMapper');

/**
 * Ánh xạ mã trạng thái từ GHN v2 sang trạng thái bưu kiện nội bộ (ShipmentStatus).
 *
 * Danh mục trạng thái GHN v2 chuẩn:
 * - ready_to_pick: Mới tạo, chờ lấy hàng -> CREATED
 * - picking: Shipper đang đi lấy hàng -> DRIVER_ASSIGNED
 * - picked, storing, sorting, transporting: Đã lấy hàng / Đang trung chuyển -> IN_TRANSIT
 * - delivering, money_collect_delivering: Shipper đang đi giao -> OUT_FOR_DELIVERY
 * - delivered: Giao hàng thành công -> DELIVERED
 * - delivery_fail: Giao hàng thất bại -> DELIVERY_FAILED
 * - waiting_to_return, return, return_transporting, return_sorting, returning: Đang chuyển hoàn -> RETURNING
 * - returned: Đã chuyển hoàn xong -> RETURNED
 * - cancel: Đơn đã hủy -> CANCELLED
 *
 * [CRITICAL CORRECTION - DES-06 & DES-07]:
 * Bất kỳ mã trạng thái lạ nào không nằm trong danh mục trên => Trả về 'EXCEPTION'
 * và ghi log ERROR cảnh báo hệ thống. TUYỆT ĐỐI KHÔNG tự động gán 'IN_TRANSIT'.
 */
export function mapGHNStatus(ghnStatus: string | null | undefined): string {
  if (!ghnStatus || typeof ghnStatus !== 'string') {
    logger.error({
      event: 'ghn_unknown_status_received',
      rawStatus: ghnStatus,
      mappedStatus: 'EXCEPTION',
      message: 'Received invalid or empty GHN status. Mapped to EXCEPTION.',
    });
    return 'EXCEPTION';
  }

  const normalized = ghnStatus.toLowerCase().trim();

  switch (normalized) {
    case 'ready_to_pick':
      return 'CREATED';

    case 'picking':
      return 'DRIVER_ASSIGNED';

    case 'picked':
    case 'storing':
    case 'sorting':
    case 'transporting':
      return 'IN_TRANSIT';

    case 'delivering':
    case 'money_collect_delivering':
      return 'OUT_FOR_DELIVERY';

    case 'delivered':
      return 'DELIVERED';

    case 'delivery_fail':
      return 'DELIVERY_FAILED';

    case 'waiting_to_return':
    case 'return':
    case 'return_transporting':
    case 'return_sorting':
    case 'returning':
      return 'RETURNING';

    case 'returned':
      return 'RETURNED';

    case 'cancel':
      return 'CANCELLED';

    default:
      logger.error({
        event: 'ghn_unmapped_status_alert',
        rawStatus: ghnStatus,
        mappedStatus: 'EXCEPTION',
        message: `Unmapped GHN status code "${ghnStatus}". Mapped to EXCEPTION for manual investigation.`,
      });
      return 'EXCEPTION';
  }
}
