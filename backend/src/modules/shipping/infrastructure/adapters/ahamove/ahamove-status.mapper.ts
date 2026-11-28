import { Logger } from '@nestjs/common';

const logger = new Logger('AhamoveStatusMapper');

/**
 * Ánh xạ trạng thái chuyến đi và trạng thái điểm giao của Ahamove sang trạng thái bưu kiện nội bộ (ShipmentStatus).
 *
 * Ahamove State Transition Matrix:
 * - CANCELLED: Chuyến đi đã bị hủy -> CANCELLED
 * - ASSIGNING: Đang tìm tài xế -> CREATED
 * - ACCEPTED: Tài xế đã nhận cuốc -> DRIVER_ASSIGNED
 * - IN_PROCESS:
 *     - dropoffStatus === 'DELIVERING' -> OUT_FOR_DELIVERY
 *     - dropoffStatus === 'PENDING' -> IN_TRANSIT (hoặc PICKED_UP)
 *     - mặc định -> IN_TRANSIT
 * - COMPLETED:
 *     - dropoffStatus === 'FAILED' -> DELIVERY_FAILED
 *     - mặc định -> DELIVERED
 * - FAILED: Chuyến đi thất bại -> DELIVERY_FAILED
 * - RETURNING: Đang hoàn trả hàng về Showroom -> RETURNING
 * - RETURNED: Đã trả hàng về Showroom -> RETURNED
 *
 * [CRITICAL CORRECTION - DES-06 & DES-07]:
 * Bất kỳ trạng thái lạ nào không nằm trong danh mục trên => Bắt buộc trả về 'EXCEPTION'
 * và ghi log ERROR cảnh báo hệ thống. TUYỆT ĐỐI KHÔNG tự động gán 'IN_TRANSIT'.
 */
export function mapAhamoveStatus(
  orderStatus: string | null | undefined,
  dropoffStatus?: string | null,
): string {
  if (!orderStatus || typeof orderStatus !== 'string') {
    logger.error({
      event: 'ahamove_unknown_status_received',
      rawStatus: orderStatus,
      dropoffStatus,
      mappedStatus: 'EXCEPTION',
      message: 'Received invalid or empty Ahamove status. Mapped to EXCEPTION.',
    });
    return 'EXCEPTION';
  }

  const normalizedOrder = orderStatus.toUpperCase().trim();
  const normalizedDropoff = dropoffStatus ? dropoffStatus.toUpperCase().trim() : undefined;

  switch (normalizedOrder) {
    case 'CANCELLED':
      return 'CANCELLED';

    case 'ASSIGNING':
      return 'CREATED';

    case 'ACCEPTED':
      return 'DRIVER_ASSIGNED';

    case 'IN_PROCESS':
      if (normalizedDropoff === 'DELIVERING') {
        return 'OUT_FOR_DELIVERY';
      }
      return 'IN_TRANSIT';

    case 'COMPLETED':
      if (normalizedDropoff === 'FAILED') {
        return 'DELIVERY_FAILED';
      }
      return 'DELIVERED';

    case 'FAILED':
      return 'DELIVERY_FAILED';

    case 'RETURNING':
      return 'RETURNING';

    case 'RETURNED':
      return 'RETURNED';

    default:
      logger.error({
        event: 'ahamove_unmapped_status_alert',
        rawOrderStatus: orderStatus,
        rawDropoffStatus: dropoffStatus,
        mappedStatus: 'EXCEPTION',
        message: `Unmapped Ahamove status code "${orderStatus}". Mapped to EXCEPTION for manual investigation.`,
      });
      return 'EXCEPTION';
  }
}
